import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  // Verify cron secret to prevent abuse
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Reduce intensity by 5% for all non-permanent pixels
  const { error } = await supabase.rpc('fade_pixels')

  if (error) {
    // Fallback if RPC doesn't exist: select + decrement loop.
    // (supabase-js v2 has no `.raw()`, so we update row by row.)
    const { data: pixels, error: selectError } = await supabase
      .from('pixels')
      .select('x, y, intensity')
      .eq('is_permanent', false)
      .gt('intensity', 0)

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 })
    }

    for (const pixel of pixels ?? []) {
      const { error: updateError } = await supabase
        .from('pixels')
        .update({ intensity: Math.max(0, pixel.intensity - 5) })
        .eq('x', pixel.x)
        .eq('y', pixel.y)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }
  }

  // Delete fully faded pixels (optional — or keep them as white)
  await supabase.from('pixels').delete().lte('intensity', 0)

  return NextResponse.json({ success: true, timestamp: new Date().toISOString() })
}

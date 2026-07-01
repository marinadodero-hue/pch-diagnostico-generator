import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/?auth=error', req.url))
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )
    const { tokens } = await oauth2Client.getToken(code)
    const accessToken = tokens.access_token || ''

    const redirectUrl = new URL('/', req.url)
    redirectUrl.searchParams.set('access_token', accessToken)
    redirectUrl.searchParams.set('auth', 'success')
    return NextResponse.redirect(redirectUrl)
  } catch {
    return NextResponse.redirect(new URL('/?auth=error', req.url))
  }
}

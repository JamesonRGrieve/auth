import { NextRequest } from 'next/server';

export const AuthMode = {
  None: 0,
  GTAuth: 1,
  MagicalAuth: 2,
};
export const getAuthMode = (): number => {
  let authMode = AuthMode.None;
  if (process.env.NEXT_PUBLIC_AUTH_URI && process.env.NEXT_PUBLIC_API_URI) {
    if (process.env.APP_URI && process.env.NEXT_PUBLIC_AUTH_URI.startsWith(process.env.APP_URI)) {
      authMode = AuthMode.MagicalAuth;
      if (!process.env.NEXT_PUBLIC_AUTH_URI.endsWith('/user')) {
        throw new Error('Invalid AUTH_URI. For Magical Auth implementations, AUTH_URI must point to APP_URI/user.');
      }
    } else {
      authMode = AuthMode.GTAuth;
    }
  }
  return authMode;
};
export const generateCookieString = (key: string, value: string, age: string): string =>
  `${key}=${value}; Domain=${process.env.NEXT_PUBLIC_COOKIE_DOMAIN}; Path=/; Max-Age=${age}; SameSite=strict;`;

export const getQueryParams = (req: NextRequest): any =>
  req.url.includes('?')
    ? Object.assign(
        {},
        ...req.url
          .split('?')[1]
          .split('&')
          .map((param) => ({ [param.split('=')[0]]: param.split('=')[1] })),
      )
    : {};

export const getRequestedURI = (req: NextRequest): string => {
  console.log(`Processing: ${req.url}`);

  const appUri = process.env.APP_URI || '';
  const singleWordDomainRegex = /^[a-zA-Z\d-]+$/; // Match single word domains (no TLD)

  // Parse the URL
  const url = new URL(req.url);

  // Match the protocol, domain, and optional port
  const processedUrl = url.origin.replace(/https?:\/\/([a-zA-Z\d.-]+)(?::\d+)?/, (match, domain) => {
    // If the domain is a single word (like localhost or 0f86ff25b193), replace it with APP_URI
    if (singleWordDomainRegex.test(domain)) {
      // Remove trailing slash from appUri if it exists
      const cleanAppUri = appUri.replace(/\/$/, '');

      // Get the path without leading slash
      const path = url.pathname.replace(/^\//, '');

      // Check if the path is already included in the APP_URI
      if (cleanAppUri.endsWith(path)) {
        return cleanAppUri;
      }

      // Rebuild the URL with the APP_URI and path
      return `${cleanAppUri}/${path}`;
    }
    return match; // Return the match as is if the domain is not a single word
  });

  // Combine the processed URL with the original path and search params
  return `${processedUrl}${url.search}`;
};

export const getJWT = (req: NextRequest) => {
  const rawJWT = req.cookies.get('jwt')?.value;
  // Strip any and all 'Bearer 's off of JWT.
  const jwt = rawJWT?.split(' ')[rawJWT?.split(' ').length - 1] ?? rawJWT ?? '';
  console.log('JWT:', jwt);
  return jwt;
};
export const verifyJWT = async (jwt: string): Promise<Response> => {
  const responses = {} as any;
  const authEndpoint = `${process.env.APP_URI.includes('localhost') ? process.env.API_URI : process.env.SERVERSIDE_API_URI}/v1`;
  let response;
  console.log(`Verifying JWT Bearer ${jwt} with server at ${authEndpoint}...`);
  try {
    response = await fetch(authEndpoint, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
    });

    console.log(`Successfully contacted server at ${authEndpoint}!`);
    return response;
  } catch (exception) {
    console.log(`Failed to contact server at ${authEndpoint} - ${exception}.`);
    return new Response();
  }
};

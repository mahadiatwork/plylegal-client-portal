import { NextResponse } from "next/server";

// Protected routes that require authentication
const protectedRoutes = ["/applications", "/profile", "/intake"];

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Check if the current path is a protected route
  const isProtected = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  if (isProtected) {
    // In Next.js middleware, we can't access localStorage
    // So we'll let the client-side handle the redirect
    // This middleware just ensures the route exists
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and API routes
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

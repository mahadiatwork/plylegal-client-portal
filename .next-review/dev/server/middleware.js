"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "proxy";
exports.ids = ["proxy"];
exports.modules = {

/***/ "(middleware)/./node_modules/.pnpm/next@16.1.0_@babel+core@7.2_b44a7ea658e53f5f68f37d2fc9136a56/node_modules/next/dist/build/webpack/loaders/next-middleware-loader.js?absolutePagePath=F%3A%5CProjects%5Cvalidifypro-visa-portal%5Cproxy.js&page=%2Fproxy&rootDir=F%3A%5CProjects%5Cvalidifypro-visa-portal&matchers=&preferredRegion=&middlewareConfig=e30%3D!":
/*!**********************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/next@16.1.0_@babel+core@7.2_b44a7ea658e53f5f68f37d2fc9136a56/node_modules/next/dist/build/webpack/loaders/next-middleware-loader.js?absolutePagePath=F%3A%5CProjects%5Cvalidifypro-visa-portal%5Cproxy.js&page=%2Fproxy&rootDir=F%3A%5CProjects%5Cvalidifypro-visa-portal&matchers=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \**********************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_web_globals__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/web/globals */ \"(middleware)/./node_modules/.pnpm/next@16.1.0_@babel+core@7.2_b44a7ea658e53f5f68f37d2fc9136a56/node_modules/next/dist/server/web/globals.js\");\n/* harmony import */ var next_dist_server_web_globals__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_web_globals__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_web_adapter__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/web/adapter */ \"(middleware)/./node_modules/.pnpm/next@16.1.0_@babel+core@7.2_b44a7ea658e53f5f68f37d2fc9136a56/node_modules/next/dist/server/web/adapter.js\");\n/* harmony import */ var next_dist_server_web_adapter__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_web_adapter__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _proxy_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./proxy.js */ \"(middleware)/./proxy.js\");\n/* harmony import */ var next_dist_client_components_is_next_router_error__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! next/dist/client/components/is-next-router-error */ \"(middleware)/./node_modules/.pnpm/next@16.1.0_@babel+core@7.2_b44a7ea658e53f5f68f37d2fc9136a56/node_modules/next/dist/client/components/is-next-router-error.js\");\n/* harmony import */ var next_dist_client_components_is_next_router_error__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(next_dist_client_components_is_next_router_error__WEBPACK_IMPORTED_MODULE_3__);\n\n\n// Import the userland code.\n\n\n\nconst mod = {\n    ..._proxy_js__WEBPACK_IMPORTED_MODULE_2__\n};\nconst page = \"/proxy\";\nconst isProxy = page === '/proxy' || page === '/src/proxy';\nconst handlerUserland = (isProxy ? mod.proxy : mod.middleware) || mod.default;\nclass ProxyMissingExportError extends Error {\n    constructor(message){\n        super(message);\n        // Stack isn't useful here, remove it considering it spams logs during development.\n        this.stack = '';\n    }\n}\n// TODO: This spams logs during development. Find a better way to handle this.\n// Removing this will spam \"fn is not a function\" logs which is worse.\nif (typeof handlerUserland !== 'function') {\n    throw new ProxyMissingExportError(`The ${isProxy ? 'Proxy' : 'Middleware'} file \"${page}\" must export a function named \\`${isProxy ? 'proxy' : 'middleware'}\\` or a default function.`);\n}\n// Proxy will only sent out the FetchEvent to next server,\n// so load instrumentation module here and track the error inside proxy module.\nfunction errorHandledHandler(fn) {\n    return async (...args)=>{\n        try {\n            return await fn(...args);\n        } catch (err) {\n            // In development, error the navigation API usage in runtime,\n            // since it's not allowed to be used in proxy as it's outside of react component tree.\n            if (true) {\n                if ((0,next_dist_client_components_is_next_router_error__WEBPACK_IMPORTED_MODULE_3__.isNextRouterError)(err)) {\n                    err.message = `Next.js navigation API is not allowed to be used in ${isProxy ? 'Proxy' : 'Middleware'}.`;\n                    throw err;\n                }\n            }\n            const req = args[0];\n            const url = new URL(req.url);\n            const resource = url.pathname + url.search;\n            await (0,next_dist_server_web_globals__WEBPACK_IMPORTED_MODULE_0__.edgeInstrumentationOnRequestError)(err, {\n                path: resource,\n                method: req.method,\n                headers: Object.fromEntries(req.headers.entries())\n            }, {\n                routerKind: 'Pages Router',\n                routePath: '/proxy',\n                routeType: 'proxy',\n                revalidateReason: undefined\n            });\n            throw err;\n        }\n    };\n}\nconst handler = (opts)=>{\n    return (0,next_dist_server_web_adapter__WEBPACK_IMPORTED_MODULE_1__.adapter)({\n        ...opts,\n        page,\n        handler: errorHandledHandler(handlerUserland)\n    });\n};\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (handler);\n\n//# sourceMappingURL=middleware.js.map\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKG1pZGRsZXdhcmUpLy4vbm9kZV9tb2R1bGVzLy5wbnBtL25leHRAMTYuMS4wX0BiYWJlbCtjb3JlQDcuMl9iNDRhN2VhNjU4ZTUzZjVmNjhmMzdkMmZjOTEzNmE1Ni9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LW1pZGRsZXdhcmUtbG9hZGVyLmpzP2Fic29sdXRlUGFnZVBhdGg9RiUzQSU1Q1Byb2plY3RzJTVDdmFsaWRpZnlwcm8tdmlzYS1wb3J0YWwlNUNwcm94eS5qcyZwYWdlPSUyRnByb3h5JnJvb3REaXI9RiUzQSU1Q1Byb2plY3RzJTVDdmFsaWRpZnlwcm8tdmlzYS1wb3J0YWwmbWF0Y2hlcnM9JnByZWZlcnJlZFJlZ2lvbj0mbWlkZGxld2FyZUNvbmZpZz1lMzAlM0QhIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQXNDO0FBQ2lCO0FBQ3ZEO0FBQ21DO0FBQzhDO0FBQ0k7QUFDckY7QUFDQSxPQUFPLHNDQUFJO0FBQ1g7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDZDQUE2QyxrQ0FBa0MsUUFBUSxLQUFLLG1DQUFtQyxpQ0FBaUM7QUFDaEs7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBLGdCQUFnQixJQUFxQztBQUNyRCxvQkFBb0IsbUdBQWlCO0FBQ3JDLHlGQUF5RixpQ0FBaUM7QUFDMUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esa0JBQWtCLCtGQUFpQztBQUNuRDtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVcscUVBQU87QUFDbEI7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0EsaUVBQWUsT0FBTyxFQUFDOztBQUV2QiIsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBcIm5leHQvZGlzdC9zZXJ2ZXIvd2ViL2dsb2JhbHNcIjtcbmltcG9ydCB7IGFkYXB0ZXIgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci93ZWIvYWRhcHRlclwiO1xuLy8gSW1wb3J0IHRoZSB1c2VybGFuZCBjb2RlLlxuaW1wb3J0ICogYXMgX21vZCBmcm9tIFwiLi9wcm94eS5qc1wiO1xuaW1wb3J0IHsgZWRnZUluc3RydW1lbnRhdGlvbk9uUmVxdWVzdEVycm9yIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvd2ViL2dsb2JhbHNcIjtcbmltcG9ydCB7IGlzTmV4dFJvdXRlckVycm9yIH0gZnJvbSBcIm5leHQvZGlzdC9jbGllbnQvY29tcG9uZW50cy9pcy1uZXh0LXJvdXRlci1lcnJvclwiO1xuY29uc3QgbW9kID0ge1xuICAgIC4uLl9tb2Rcbn07XG5jb25zdCBwYWdlID0gXCIvcHJveHlcIjtcbmNvbnN0IGlzUHJveHkgPSBwYWdlID09PSAnL3Byb3h5JyB8fCBwYWdlID09PSAnL3NyYy9wcm94eSc7XG5jb25zdCBoYW5kbGVyVXNlcmxhbmQgPSAoaXNQcm94eSA/IG1vZC5wcm94eSA6IG1vZC5taWRkbGV3YXJlKSB8fCBtb2QuZGVmYXVsdDtcbmNsYXNzIFByb3h5TWlzc2luZ0V4cG9ydEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICAgIGNvbnN0cnVjdG9yKG1lc3NhZ2Upe1xuICAgICAgICBzdXBlcihtZXNzYWdlKTtcbiAgICAgICAgLy8gU3RhY2sgaXNuJ3QgdXNlZnVsIGhlcmUsIHJlbW92ZSBpdCBjb25zaWRlcmluZyBpdCBzcGFtcyBsb2dzIGR1cmluZyBkZXZlbG9wbWVudC5cbiAgICAgICAgdGhpcy5zdGFjayA9ICcnO1xuICAgIH1cbn1cbi8vIFRPRE86IFRoaXMgc3BhbXMgbG9ncyBkdXJpbmcgZGV2ZWxvcG1lbnQuIEZpbmQgYSBiZXR0ZXIgd2F5IHRvIGhhbmRsZSB0aGlzLlxuLy8gUmVtb3ZpbmcgdGhpcyB3aWxsIHNwYW0gXCJmbiBpcyBub3QgYSBmdW5jdGlvblwiIGxvZ3Mgd2hpY2ggaXMgd29yc2UuXG5pZiAodHlwZW9mIGhhbmRsZXJVc2VybGFuZCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBQcm94eU1pc3NpbmdFeHBvcnRFcnJvcihgVGhlICR7aXNQcm94eSA/ICdQcm94eScgOiAnTWlkZGxld2FyZSd9IGZpbGUgXCIke3BhZ2V9XCIgbXVzdCBleHBvcnQgYSBmdW5jdGlvbiBuYW1lZCBcXGAke2lzUHJveHkgPyAncHJveHknIDogJ21pZGRsZXdhcmUnfVxcYCBvciBhIGRlZmF1bHQgZnVuY3Rpb24uYCk7XG59XG4vLyBQcm94eSB3aWxsIG9ubHkgc2VudCBvdXQgdGhlIEZldGNoRXZlbnQgdG8gbmV4dCBzZXJ2ZXIsXG4vLyBzbyBsb2FkIGluc3RydW1lbnRhdGlvbiBtb2R1bGUgaGVyZSBhbmQgdHJhY2sgdGhlIGVycm9yIGluc2lkZSBwcm94eSBtb2R1bGUuXG5mdW5jdGlvbiBlcnJvckhhbmRsZWRIYW5kbGVyKGZuKSB7XG4gICAgcmV0dXJuIGFzeW5jICguLi5hcmdzKT0+e1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGZuKC4uLmFyZ3MpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIC8vIEluIGRldmVsb3BtZW50LCBlcnJvciB0aGUgbmF2aWdhdGlvbiBBUEkgdXNhZ2UgaW4gcnVudGltZSxcbiAgICAgICAgICAgIC8vIHNpbmNlIGl0J3Mgbm90IGFsbG93ZWQgdG8gYmUgdXNlZCBpbiBwcm94eSBhcyBpdCdzIG91dHNpZGUgb2YgcmVhY3QgY29tcG9uZW50IHRyZWUuXG4gICAgICAgICAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICAgICAgICAgICAgICAgIGlmIChpc05leHRSb3V0ZXJFcnJvcihlcnIpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVyci5tZXNzYWdlID0gYE5leHQuanMgbmF2aWdhdGlvbiBBUEkgaXMgbm90IGFsbG93ZWQgdG8gYmUgdXNlZCBpbiAke2lzUHJveHkgPyAnUHJveHknIDogJ01pZGRsZXdhcmUnfS5gO1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgcmVxID0gYXJnc1swXTtcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmVxLnVybCk7XG4gICAgICAgICAgICBjb25zdCByZXNvdXJjZSA9IHVybC5wYXRobmFtZSArIHVybC5zZWFyY2g7XG4gICAgICAgICAgICBhd2FpdCBlZGdlSW5zdHJ1bWVudGF0aW9uT25SZXF1ZXN0RXJyb3IoZXJyLCB7XG4gICAgICAgICAgICAgICAgcGF0aDogcmVzb3VyY2UsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiByZXEubWV0aG9kLFxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IE9iamVjdC5mcm9tRW50cmllcyhyZXEuaGVhZGVycy5lbnRyaWVzKCkpXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgcm91dGVyS2luZDogJ1BhZ2VzIFJvdXRlcicsXG4gICAgICAgICAgICAgICAgcm91dGVQYXRoOiAnL3Byb3h5JyxcbiAgICAgICAgICAgICAgICByb3V0ZVR5cGU6ICdwcm94eScsXG4gICAgICAgICAgICAgICAgcmV2YWxpZGF0ZVJlYXNvbjogdW5kZWZpbmVkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgIH07XG59XG5jb25zdCBoYW5kbGVyID0gKG9wdHMpPT57XG4gICAgcmV0dXJuIGFkYXB0ZXIoe1xuICAgICAgICAuLi5vcHRzLFxuICAgICAgICBwYWdlLFxuICAgICAgICBoYW5kbGVyOiBlcnJvckhhbmRsZWRIYW5kbGVyKGhhbmRsZXJVc2VybGFuZClcbiAgICB9KTtcbn07XG5leHBvcnQgZGVmYXVsdCBoYW5kbGVyO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1taWRkbGV3YXJlLmpzLm1hcFxuIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(middleware)/./node_modules/.pnpm/next@16.1.0_@babel+core@7.2_b44a7ea658e53f5f68f37d2fc9136a56/node_modules/next/dist/build/webpack/loaders/next-middleware-loader.js?absolutePagePath=F%3A%5CProjects%5Cvalidifypro-visa-portal%5Cproxy.js&page=%2Fproxy&rootDir=F%3A%5CProjects%5Cvalidifypro-visa-portal&matchers=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(middleware)/./proxy.js":
/*!******************!*\
  !*** ./proxy.js ***!
  \******************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   config: () => (/* binding */ config),\n/* harmony export */   proxy: () => (/* binding */ proxy)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(middleware)/./node_modules/.pnpm/next@16.1.0_@babel+core@7.2_b44a7ea658e53f5f68f37d2fc9136a56/node_modules/next/dist/api/server.js\");\n\n// Protected routes that require authentication\nconst protectedRoutes = [\n    \"/applications\",\n    \"/profile\",\n    \"/intake\"\n];\nfunction proxy(request) {\n    const { pathname } = request.nextUrl;\n    // Check if the current path is a protected route\n    const isProtected = protectedRoutes.some((route)=>pathname.startsWith(route));\n    if (isProtected) {\n        // In Next.js middleware, we can't access localStorage\n        // So we'll let the client-side handle the redirect\n        // This middleware just ensures the route exists\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.next();\n    }\n    return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.next();\n}\nconst config = {\n    matcher: [\n        // Match all routes except static files and API routes\n        \"/((?!api|_next/static|_next/image|favicon.ico).*)\"\n    ]\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKG1pZGRsZXdhcmUpLy4vcHJveHkuanMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQTJDO0FBRTNDLCtDQUErQztBQUMvQyxNQUFNQyxrQkFBa0I7SUFBQztJQUFpQjtJQUFZO0NBQVU7QUFFekQsU0FBU0MsTUFBTUMsT0FBTztJQUMzQixNQUFNLEVBQUVDLFFBQVEsRUFBRSxHQUFHRCxRQUFRRSxPQUFPO0lBRXBDLGlEQUFpRDtJQUNqRCxNQUFNQyxjQUFjTCxnQkFBZ0JNLElBQUksQ0FBQ0MsQ0FBQUEsUUFDdkNKLFNBQVNLLFVBQVUsQ0FBQ0Q7SUFHdEIsSUFBSUYsYUFBYTtRQUNmLHNEQUFzRDtRQUN0RCxtREFBbUQ7UUFDbkQsZ0RBQWdEO1FBQ2hELE9BQU9OLHFEQUFZQSxDQUFDVSxJQUFJO0lBQzFCO0lBRUEsT0FBT1YscURBQVlBLENBQUNVLElBQUk7QUFDMUI7QUFFTyxNQUFNQyxTQUFTO0lBQ3BCQyxTQUFTO1FBQ1Asc0RBQXNEO1FBQ3REO0tBQ0Q7QUFDSCxFQUFFIiwic291cmNlcyI6WyJGOlxcUHJvamVjdHNcXHZhbGlkaWZ5cHJvLXZpc2EtcG9ydGFsXFxwcm94eS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXh0UmVzcG9uc2UgfSBmcm9tIFwibmV4dC9zZXJ2ZXJcIjtcclxuXHJcbi8vIFByb3RlY3RlZCByb3V0ZXMgdGhhdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXHJcbmNvbnN0IHByb3RlY3RlZFJvdXRlcyA9IFtcIi9hcHBsaWNhdGlvbnNcIiwgXCIvcHJvZmlsZVwiLCBcIi9pbnRha2VcIl07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcHJveHkocmVxdWVzdCkge1xyXG4gIGNvbnN0IHsgcGF0aG5hbWUgfSA9IHJlcXVlc3QubmV4dFVybDtcclxuICBcclxuICAvLyBDaGVjayBpZiB0aGUgY3VycmVudCBwYXRoIGlzIGEgcHJvdGVjdGVkIHJvdXRlXHJcbiAgY29uc3QgaXNQcm90ZWN0ZWQgPSBwcm90ZWN0ZWRSb3V0ZXMuc29tZShyb3V0ZSA9PiBcclxuICAgIHBhdGhuYW1lLnN0YXJ0c1dpdGgocm91dGUpXHJcbiAgKTtcclxuICBcclxuICBpZiAoaXNQcm90ZWN0ZWQpIHtcclxuICAgIC8vIEluIE5leHQuanMgbWlkZGxld2FyZSwgd2UgY2FuJ3QgYWNjZXNzIGxvY2FsU3RvcmFnZVxyXG4gICAgLy8gU28gd2UnbGwgbGV0IHRoZSBjbGllbnQtc2lkZSBoYW5kbGUgdGhlIHJlZGlyZWN0XHJcbiAgICAvLyBUaGlzIG1pZGRsZXdhcmUganVzdCBlbnN1cmVzIHRoZSByb3V0ZSBleGlzdHNcclxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UubmV4dCgpO1xyXG4gIH1cclxuICBcclxuICByZXR1cm4gTmV4dFJlc3BvbnNlLm5leHQoKTtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGNvbmZpZyA9IHtcclxuICBtYXRjaGVyOiBbXHJcbiAgICAvLyBNYXRjaCBhbGwgcm91dGVzIGV4Y2VwdCBzdGF0aWMgZmlsZXMgYW5kIEFQSSByb3V0ZXNcclxuICAgIFwiLygoPyFhcGl8X25leHQvc3RhdGljfF9uZXh0L2ltYWdlfGZhdmljb24uaWNvKS4qKVwiLFxyXG4gIF0sXHJcbn07XHJcbiJdLCJuYW1lcyI6WyJOZXh0UmVzcG9uc2UiLCJwcm90ZWN0ZWRSb3V0ZXMiLCJwcm94eSIsInJlcXVlc3QiLCJwYXRobmFtZSIsIm5leHRVcmwiLCJpc1Byb3RlY3RlZCIsInNvbWUiLCJyb3V0ZSIsInN0YXJ0c1dpdGgiLCJuZXh0IiwiY29uZmlnIiwibWF0Y2hlciJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(middleware)/./proxy.js\n");

/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "../incremental-cache/tags-manifest.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/lib/incremental-cache/tags-manifest.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/server/lib/incremental-cache/tags-manifest.external.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "node:async_hooks":
/*!***********************************!*\
  !*** external "node:async_hooks" ***!
  \***********************************/
/***/ ((module) => {

module.exports = require("node:async_hooks");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("./webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next@16.1.0_@babel+core@7.2_b44a7ea658e53f5f68f37d2fc9136a56","vendor-chunks/@opentelemetry+api@1.9.0"], () => (__webpack_exec__("(middleware)/./node_modules/.pnpm/next@16.1.0_@babel+core@7.2_b44a7ea658e53f5f68f37d2fc9136a56/node_modules/next/dist/build/webpack/loaders/next-middleware-loader.js?absolutePagePath=F%3A%5CProjects%5Cvalidifypro-visa-portal%5Cproxy.js&page=%2Fproxy&rootDir=F%3A%5CProjects%5Cvalidifypro-visa-portal&matchers=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();
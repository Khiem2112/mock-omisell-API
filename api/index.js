// node_modules/@hono/node-server/dist/index.mjs
import { Http2ServerRequest as Http2ServerRequest2, constants as h2constants } from "http2";
import { Http2ServerRequest } from "http2";
import { Readable } from "stream";
import crypto2 from "crypto";
var RequestError = class extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "RequestError";
  }
};
var validateRequestTarget = (target) => {
  const backslash = target.indexOf("\\");
  if (backslash !== -1) {
    const query = target.indexOf("?");
    if (query === -1 || backslash < query) {
      throw new RequestError("Backslash in request path");
    }
  }
};
var toRequestError = (e) => {
  if (e instanceof RequestError) {
    return e;
  }
  return new RequestError(e.message, { cause: e });
};
var GlobalRequest = global.Request;
var Request2 = class extends GlobalRequest {
  constructor(input, options) {
    if (typeof input === "object" && getRequestCache in input) {
      input = input[getRequestCache]();
    }
    if (typeof options?.body?.getReader !== "undefined") {
      ;
      options.duplex ??= "half";
    }
    super(input, options);
  }
};
var newHeadersFromIncoming = (incoming) => {
  const headerRecord = [];
  const rawHeaders = incoming.rawHeaders;
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const { [i]: key, [i + 1]: value } = rawHeaders;
    if (key.charCodeAt(0) !== /*:*/
    58) {
      headerRecord.push([key, value]);
    }
  }
  return new Headers(headerRecord);
};
var wrapBodyStream = /* @__PURE__ */ Symbol("wrapBodyStream");
var newRequestFromIncoming = (method, url, headers, incoming, abortController) => {
  const init = {
    method,
    headers,
    signal: abortController.signal
  };
  if (method === "TRACE") {
    init.method = "GET";
    const req = new Request2(url, init);
    Object.defineProperty(req, "method", {
      get() {
        return "TRACE";
      }
    });
    return req;
  }
  if (!(method === "GET" || method === "HEAD")) {
    if ("rawBody" in incoming && incoming.rawBody instanceof Buffer) {
      init.body = new ReadableStream({
        start(controller) {
          controller.enqueue(incoming.rawBody);
          controller.close();
        }
      });
    } else if (incoming[wrapBodyStream]) {
      let reader;
      init.body = new ReadableStream({
        async pull(controller) {
          try {
            reader ||= Readable.toWeb(incoming).getReader();
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
            } else {
              controller.enqueue(value);
            }
          } catch (error) {
            controller.error(error);
          }
        }
      });
    } else {
      init.body = Readable.toWeb(incoming);
    }
  }
  return new Request2(url, init);
};
var getRequestCache = /* @__PURE__ */ Symbol("getRequestCache");
var requestCache = /* @__PURE__ */ Symbol("requestCache");
var incomingKey = /* @__PURE__ */ Symbol("incomingKey");
var urlKey = /* @__PURE__ */ Symbol("urlKey");
var headersKey = /* @__PURE__ */ Symbol("headersKey");
var abortControllerKey = /* @__PURE__ */ Symbol("abortControllerKey");
var getAbortController = /* @__PURE__ */ Symbol("getAbortController");
var requestPrototype = {
  get method() {
    return this[incomingKey].method || "GET";
  },
  get url() {
    return this[urlKey];
  },
  get headers() {
    return this[headersKey] ||= newHeadersFromIncoming(this[incomingKey]);
  },
  [getAbortController]() {
    this[getRequestCache]();
    return this[abortControllerKey];
  },
  [getRequestCache]() {
    this[abortControllerKey] ||= new AbortController();
    return this[requestCache] ||= newRequestFromIncoming(
      this.method,
      this[urlKey],
      this.headers,
      this[incomingKey],
      this[abortControllerKey]
    );
  }
};
[
  "body",
  "bodyUsed",
  "cache",
  "credentials",
  "destination",
  "integrity",
  "mode",
  "redirect",
  "referrer",
  "referrerPolicy",
  "signal",
  "keepalive"
].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    get() {
      return this[getRequestCache]()[k];
    }
  });
});
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    value: function() {
      return this[getRequestCache]()[k]();
    }
  });
});
Object.defineProperty(requestPrototype, /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom"), {
  value: function(depth, options, inspectFn) {
    const props = {
      method: this.method,
      url: this.url,
      headers: this.headers,
      nativeRequest: this[requestCache]
    };
    return `Request (lightweight) ${inspectFn(props, { ...options, depth: depth == null ? null : depth - 1 })}`;
  }
});
Object.setPrototypeOf(requestPrototype, Request2.prototype);
var newRequest = (incoming, defaultHostname) => {
  const req = Object.create(requestPrototype);
  req[incomingKey] = incoming;
  const incomingUrl = incoming.url || "";
  if (incomingUrl[0] !== "/" && // short-circuit for performance. most requests are relative URL.
  (incomingUrl.startsWith("http://") || incomingUrl.startsWith("https://"))) {
    if (incoming instanceof Http2ServerRequest) {
      throw new RequestError("Absolute URL for :path is not allowed in HTTP/2");
    }
    try {
      validateRequestTarget(incomingUrl);
      const url2 = new URL(incomingUrl);
      req[urlKey] = url2.href;
    } catch (e) {
      throw new RequestError("Invalid absolute URL", { cause: e });
    }
    return req;
  }
  const host = (incoming instanceof Http2ServerRequest ? incoming.authority : incoming.headers.host) || defaultHostname;
  if (!host) {
    throw new RequestError("Missing host header");
  }
  let scheme;
  if (incoming instanceof Http2ServerRequest) {
    scheme = incoming.scheme;
    if (!(scheme === "http" || scheme === "https")) {
      throw new RequestError("Unsupported scheme");
    }
  } else {
    scheme = incoming.socket && incoming.socket.encrypted ? "https" : "http";
  }
  validateRequestTarget(incomingUrl);
  const url = new URL(`${scheme}://${host}${incomingUrl}`);
  if (url.hostname.length !== host.length && url.hostname !== host.replace(/:\d+$/, "")) {
    throw new RequestError("Invalid host header");
  }
  req[urlKey] = url.href;
  return req;
};
var responseCache = /* @__PURE__ */ Symbol("responseCache");
var getResponseCache = /* @__PURE__ */ Symbol("getResponseCache");
var cacheKey = /* @__PURE__ */ Symbol("cache");
var GlobalResponse = global.Response;
var Response2 = class _Response {
  #body;
  #init;
  [getResponseCache]() {
    delete this[cacheKey];
    return this[responseCache] ||= new GlobalResponse(this.#body, this.#init);
  }
  constructor(body, init) {
    let headers;
    this.#body = body;
    if (init instanceof _Response) {
      const cachedGlobalResponse = init[responseCache];
      if (cachedGlobalResponse) {
        this.#init = cachedGlobalResponse;
        this[getResponseCache]();
        return;
      } else {
        this.#init = init.#init;
        headers = new Headers(init.#init.headers);
      }
    } else {
      this.#init = init;
    }
    if (typeof body === "string" || typeof body?.getReader !== "undefined" || body instanceof Blob || body instanceof Uint8Array) {
      ;
      this[cacheKey] = [init?.status || 200, body, headers || init?.headers];
    }
  }
  get headers() {
    const cache = this[cacheKey];
    if (cache) {
      if (!(cache[2] instanceof Headers)) {
        cache[2] = new Headers(
          cache[2] || { "content-type": "text/plain; charset=UTF-8" }
        );
      }
      return cache[2];
    }
    return this[getResponseCache]().headers;
  }
  get status() {
    return this[cacheKey]?.[0] ?? this[getResponseCache]().status;
  }
  get ok() {
    const status = this.status;
    return status >= 200 && status < 300;
  }
};
["body", "bodyUsed", "redirected", "statusText", "trailers", "type", "url"].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    get() {
      return this[getResponseCache]()[k];
    }
  });
});
["arrayBuffer", "blob", "clone", "formData", "json", "text"].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    value: function() {
      return this[getResponseCache]()[k]();
    }
  });
});
Object.defineProperty(Response2.prototype, /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom"), {
  value: function(depth, options, inspectFn) {
    const props = {
      status: this.status,
      headers: this.headers,
      ok: this.ok,
      nativeResponse: this[responseCache]
    };
    return `Response (lightweight) ${inspectFn(props, { ...options, depth: depth == null ? null : depth - 1 })}`;
  }
});
Object.setPrototypeOf(Response2, GlobalResponse);
Object.setPrototypeOf(Response2.prototype, GlobalResponse.prototype);
async function readWithoutBlocking(readPromise) {
  return Promise.race([readPromise, Promise.resolve().then(() => Promise.resolve(void 0))]);
}
function writeFromReadableStreamDefaultReader(reader, writable, currentReadPromise) {
  const cancel = (error) => {
    reader.cancel(error).catch(() => {
    });
  };
  writable.on("close", cancel);
  writable.on("error", cancel);
  (currentReadPromise ?? reader.read()).then(flow, handleStreamError);
  return reader.closed.finally(() => {
    writable.off("close", cancel);
    writable.off("error", cancel);
  });
  function handleStreamError(error) {
    if (error) {
      writable.destroy(error);
    }
  }
  function onDrain() {
    reader.read().then(flow, handleStreamError);
  }
  function flow({ done, value }) {
    try {
      if (done) {
        writable.end();
      } else if (!writable.write(value)) {
        writable.once("drain", onDrain);
      } else {
        return reader.read().then(flow, handleStreamError);
      }
    } catch (e) {
      handleStreamError(e);
    }
  }
}
function writeFromReadableStream(stream, writable) {
  if (stream.locked) {
    throw new TypeError("ReadableStream is locked.");
  } else if (writable.destroyed) {
    return;
  }
  return writeFromReadableStreamDefaultReader(stream.getReader(), writable);
}
var buildOutgoingHttpHeaders = (headers) => {
  const res = {};
  if (!(headers instanceof Headers)) {
    headers = new Headers(headers ?? void 0);
  }
  const cookies = [];
  for (const [k, v] of headers) {
    if (k === "set-cookie") {
      cookies.push(v);
    } else {
      res[k] = v;
    }
  }
  if (cookies.length > 0) {
    res["set-cookie"] = cookies;
  }
  res["content-type"] ??= "text/plain; charset=UTF-8";
  return res;
};
var X_ALREADY_SENT = "x-hono-already-sent";
if (typeof global.crypto === "undefined") {
  global.crypto = crypto2;
}
var outgoingEnded = /* @__PURE__ */ Symbol("outgoingEnded");
var incomingDraining = /* @__PURE__ */ Symbol("incomingDraining");
var DRAIN_TIMEOUT_MS = 500;
var MAX_DRAIN_BYTES = 64 * 1024 * 1024;
var drainIncoming = (incoming) => {
  const incomingWithDrainState = incoming;
  if (incoming.destroyed || incomingWithDrainState[incomingDraining]) {
    return;
  }
  incomingWithDrainState[incomingDraining] = true;
  if (incoming instanceof Http2ServerRequest2) {
    try {
      ;
      incoming.stream?.close?.(h2constants.NGHTTP2_NO_ERROR);
    } catch {
    }
    return;
  }
  let bytesRead = 0;
  const cleanup = () => {
    clearTimeout(timer);
    incoming.off("data", onData);
    incoming.off("end", cleanup);
    incoming.off("error", cleanup);
  };
  const forceClose = () => {
    cleanup();
    const socket = incoming.socket;
    if (socket && !socket.destroyed) {
      socket.destroySoon();
    }
  };
  const timer = setTimeout(forceClose, DRAIN_TIMEOUT_MS);
  timer.unref?.();
  const onData = (chunk) => {
    bytesRead += chunk.length;
    if (bytesRead > MAX_DRAIN_BYTES) {
      forceClose();
    }
  };
  incoming.on("data", onData);
  incoming.on("end", cleanup);
  incoming.on("error", cleanup);
  incoming.resume();
};
var handleRequestError = () => new Response(null, {
  status: 400
});
var handleFetchError = (e) => new Response(null, {
  status: e instanceof Error && (e.name === "TimeoutError" || e.constructor.name === "TimeoutError") ? 504 : 500
});
var handleResponseError = (e, outgoing) => {
  const err = e instanceof Error ? e : new Error("unknown error", { cause: e });
  if (err.code === "ERR_STREAM_PREMATURE_CLOSE") {
    console.info("The user aborted a request.");
  } else {
    console.error(e);
    if (!outgoing.headersSent) {
      outgoing.writeHead(500, { "Content-Type": "text/plain" });
    }
    outgoing.end(`Error: ${err.message}`);
    outgoing.destroy(err);
  }
};
var flushHeaders = (outgoing) => {
  if ("flushHeaders" in outgoing && outgoing.writable) {
    outgoing.flushHeaders();
  }
};
var responseViaCache = async (res, outgoing) => {
  let [status, body, header] = res[cacheKey];
  let hasContentLength = false;
  if (!header) {
    header = { "content-type": "text/plain; charset=UTF-8" };
  } else if (header instanceof Headers) {
    hasContentLength = header.has("content-length");
    header = buildOutgoingHttpHeaders(header);
  } else if (Array.isArray(header)) {
    const headerObj = new Headers(header);
    hasContentLength = headerObj.has("content-length");
    header = buildOutgoingHttpHeaders(headerObj);
  } else {
    for (const key in header) {
      if (key.length === 14 && key.toLowerCase() === "content-length") {
        hasContentLength = true;
        break;
      }
    }
  }
  if (!hasContentLength) {
    if (typeof body === "string") {
      header["Content-Length"] = Buffer.byteLength(body);
    } else if (body instanceof Uint8Array) {
      header["Content-Length"] = body.byteLength;
    } else if (body instanceof Blob) {
      header["Content-Length"] = body.size;
    }
  }
  outgoing.writeHead(status, header);
  if (typeof body === "string" || body instanceof Uint8Array) {
    outgoing.end(body);
  } else if (body instanceof Blob) {
    outgoing.end(new Uint8Array(await body.arrayBuffer()));
  } else {
    flushHeaders(outgoing);
    await writeFromReadableStream(body, outgoing)?.catch(
      (e) => handleResponseError(e, outgoing)
    );
  }
  ;
  outgoing[outgoingEnded]?.();
};
var isPromise = (res) => typeof res.then === "function";
var responseViaResponseObject = async (res, outgoing, options = {}) => {
  if (isPromise(res)) {
    if (options.errorHandler) {
      try {
        res = await res;
      } catch (err) {
        const errRes = await options.errorHandler(err);
        if (!errRes) {
          return;
        }
        res = errRes;
      }
    } else {
      res = await res.catch(handleFetchError);
    }
  }
  if (cacheKey in res) {
    return responseViaCache(res, outgoing);
  }
  const resHeaderRecord = buildOutgoingHttpHeaders(res.headers);
  if (res.body) {
    const reader = res.body.getReader();
    const values = [];
    let done = false;
    let currentReadPromise = void 0;
    if (resHeaderRecord["transfer-encoding"] !== "chunked") {
      let maxReadCount = 2;
      for (let i = 0; i < maxReadCount; i++) {
        currentReadPromise ||= reader.read();
        const chunk = await readWithoutBlocking(currentReadPromise).catch((e) => {
          console.error(e);
          done = true;
        });
        if (!chunk) {
          if (i === 1) {
            await new Promise((resolve) => setTimeout(resolve));
            maxReadCount = 3;
            continue;
          }
          break;
        }
        currentReadPromise = void 0;
        if (chunk.value) {
          values.push(chunk.value);
        }
        if (chunk.done) {
          done = true;
          break;
        }
      }
      if (done && !("content-length" in resHeaderRecord)) {
        resHeaderRecord["content-length"] = values.reduce((acc, value) => acc + value.length, 0);
      }
    }
    outgoing.writeHead(res.status, resHeaderRecord);
    values.forEach((value) => {
      ;
      outgoing.write(value);
    });
    if (done) {
      outgoing.end();
    } else {
      if (values.length === 0) {
        flushHeaders(outgoing);
      }
      await writeFromReadableStreamDefaultReader(reader, outgoing, currentReadPromise);
    }
  } else if (resHeaderRecord[X_ALREADY_SENT]) {
  } else {
    outgoing.writeHead(res.status, resHeaderRecord);
    outgoing.end();
  }
  ;
  outgoing[outgoingEnded]?.();
};
var getRequestListener = (fetchCallback, options = {}) => {
  const autoCleanupIncoming = options.autoCleanupIncoming ?? true;
  if (options.overrideGlobalObjects !== false && global.Request !== Request2) {
    Object.defineProperty(global, "Request", {
      value: Request2
    });
    Object.defineProperty(global, "Response", {
      value: Response2
    });
  }
  return async (incoming, outgoing) => {
    let res, req;
    try {
      req = newRequest(incoming, options.hostname);
      let incomingEnded = !autoCleanupIncoming || incoming.method === "GET" || incoming.method === "HEAD";
      if (!incomingEnded) {
        ;
        incoming[wrapBodyStream] = true;
        incoming.on("end", () => {
          incomingEnded = true;
        });
        if (incoming instanceof Http2ServerRequest2) {
          ;
          outgoing[outgoingEnded] = () => {
            if (!incomingEnded) {
              setTimeout(() => {
                if (!incomingEnded) {
                  setTimeout(() => {
                    drainIncoming(incoming);
                  });
                }
              });
            }
          };
        }
        outgoing.on("finish", () => {
          if (!incomingEnded) {
            drainIncoming(incoming);
          }
        });
      }
      outgoing.on("close", () => {
        const abortController = req[abortControllerKey];
        if (abortController) {
          if (incoming.errored) {
            req[abortControllerKey].abort(incoming.errored.toString());
          } else if (!outgoing.writableFinished) {
            req[abortControllerKey].abort("Client connection prematurely closed.");
          }
        }
        if (!incomingEnded) {
          setTimeout(() => {
            if (!incomingEnded) {
              setTimeout(() => {
                drainIncoming(incoming);
              });
            }
          });
        }
      });
      res = fetchCallback(req, { incoming, outgoing });
      if (cacheKey in res) {
        return responseViaCache(res, outgoing);
      }
    } catch (e) {
      if (!res) {
        if (options.errorHandler) {
          res = await options.errorHandler(req ? e : toRequestError(e));
          if (!res) {
            return;
          }
        } else if (!req) {
          res = handleRequestError();
        } else {
          res = handleFetchError(e);
        }
      } else {
        return handleResponseError(e, outgoing);
      }
    }
    try {
      return await responseViaResponseObject(res, outgoing, options);
    } catch (e) {
      return handleResponseError(e, outgoing);
    }
  };
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = (arrayBuffer, contentType) => {
  return new Response(arrayBuffer, { headers: { "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase()) } }).formData();
};

// node_modules/hono/dist/utils/body.js
var MAX_NESTED_OBJECTS = 1e4;
var isRawRequest = (request) => "headers" in request;
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const mediaType = (isRawRequest(request) ? request.headers : request.raw.headers).get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") return parseFormData(request, {
    all,
    dot
  });
  return {};
};
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) return convertFormDataToBodyData(await request.bodyCache.formData, options);
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) request.bodyCache.formData = formDataPromise;
  const formData = await formDataPromise;
  if (formData) return convertFormDataToBodyData(formData, options);
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  const nestingState = { count: 0 };
  formData.forEach((value, key) => {
    if (!(options.all || key.endsWith("[]"))) form[key] = value;
    else handleParsingAllValues(form, key, value);
  });
  if (options.dot) Object.entries(form).forEach(([key, value]) => {
    if (key.includes(".")) {
      handleParsingNestedValues(form, key, value, nestingState);
      delete form[key];
    }
  });
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) form[key].push(value);
    else form[key] = [form[key], value];
  } else if (!key.endsWith("[]")) form[key] = value;
  else form[key] = [value];
};
var handleParsingNestedValues = (form, key, value, state) => {
  if (/(?:^|\.)__proto__\./.test(key)) return;
  let nestedForm = form;
  const keys = key.split(".", 34);
  if (keys.length > 33) throwNestingLimitExceeded();
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) nestedForm[key2] = value;
    else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        if (state.count++ >= MAX_NESTED_OBJECTS) throwNestingLimitExceeded();
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};
var throwNestingLimitExceeded = () => {
  throw new Error("Nesting limit exceeded");
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") paths.shift();
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return {
    groups,
    path
  };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) if (paths[j].includes(mark)) {
      paths[j] = paths[j].replace(mark, groups[i][1]);
      break;
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") return "*";
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey2 = `${label}#${next}`;
    if (!patternCache[cacheKey2]) {
      if (match2[2]) patternCache[cacheKey2] = next && next[0] !== ":" && next[0] !== "*" ? [
        cacheKey2,
        match2[1],
        new RegExp(`^${match2[2]}(?=/${next})`)
      ] : [
        label,
        match2[1],
        new RegExp(`^${match2[2]}$`)
      ];
      else patternCache[cacheKey2] = [
        label,
        match2[1],
        true
      ];
    }
    return patternCache[cacheKey2];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) break;
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var stripPathPrefix = (rawPath, decodedPath, prefixLength) => {
  if (rawPath.at(-1) === "/" && decodedPath.at(-1) !== "/") rawPath = rawPath.slice(0, -1);
  let index = 0;
  for (let i = decodedPath.indexOf("/"); i !== -1 && i < prefixLength; i = decodedPath.indexOf("/", i + 1)) {
    index = rawPath.indexOf("/", index + 1);
    if (index === -1) return "/";
  }
  return rawPath.slice(index) || "/";
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) sub = mergePath(sub, ...rest);
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) return null;
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) basePath += "/" + segment;
    else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") results.push("/");
        else results.push(basePath);
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else basePath += "/" + segment;
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var tryDecodeURIComponent = (str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str;
var _decodeURI = (value) => {
  if (value.indexOf("+") !== -1) value = value.replace(/\+/g, " ");
  return tryDecodeURIComponent(value);
};
var _getQueryParam = (url, key, multiple) => {
  const hashIndex = url.indexOf("#", 8);
  if (hashIndex !== -1) url = url.slice(0, hashIndex);
  let encoded;
  if (!multiple && key && !/[%+&=]/.test(key)) {
    const queryIndex = url.indexOf("?", 8);
    let keyIndex2 = queryIndex;
    if (keyIndex2 === -1) return;
    if (!url.startsWith(key, keyIndex2 + 1)) keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61 || trailingKeyCode === 38 || isNaN(trailingKeyCode)) {
        if (keyIndex2 > queryIndex && /(?:^|&)[^=&]*[%+]/.test(url.slice(queryIndex + 1, keyIndex2))) break;
        if (trailingKeyCode === 61) {
          const valueIndex = keyIndex2 + key.length + 2;
          const endIndex = url.indexOf("&", valueIndex);
          return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
        }
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) return;
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) valueIndex = -1;
    let name = url.slice(keyIndex + 1, valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex);
    if (encoded) name = _decodeURI(name);
    keyIndex = nextKeyIndex;
    if (name === "") continue;
    let value;
    if (valueIndex === -1) value = "";
    else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) value = _decodeURI(value);
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) results[name] = [];
      results[name].push(value);
    } else results[name] ??= value;
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var HonoRequest = class {
  /**
  * `.raw` can get the raw Request object.
  *
  * @see {@link https://hono.dev/docs/api/request#raw}
  *
  * @example
  * ```ts
  * // For Cloudflare Workers
  * app.post('/', async (c) => {
  *   const metadata = c.req.raw.cf?.hostMetadata?
  *   ...
  * })
  * ```
  */
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  /**
  * `.path` can get the pathname of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#path}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const pathname = c.req.path // `/about/me`
  * })
  * ```
  */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex]?.[1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex]?.[1] ?? {});
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) decoded[key] = tryDecodeURIComponent(value);
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) return this.raw.headers.get(name) ?? void 0;
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) return cachedBody;
    for (const anyCachedKey in bodyCache) return bodyCache[anyCachedKey].then((body) => {
      if (anyCachedKey === "json") body = JSON.stringify(body);
      const contentType = anyCachedKey === "formData" ? void 0 : raw2.headers.get("content-type");
      return new Response(body, { headers: contentType ? { "Content-Type": contentType } : void 0 })[key]();
    });
    return bodyCache[key] = raw2[key]();
  };
  /**
  * `.json()` can parse Request body of type `application/json`
  *
  * @see {@link https://hono.dev/docs/api/request#json}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.json()
  * })
  * ```
  */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
  * `.text()` can parse Request body of type `text/plain`
  *
  * @see {@link https://hono.dev/docs/api/request#text}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.text()
  * })
  * ```
  */
  text() {
    return this.#cachedBody("text");
  }
  /**
  * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
  *
  * @see {@link https://hono.dev/docs/api/request#arraybuffer}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.arrayBuffer()
  * })
  * ```
  */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
  * `.bytes()` parses the request body as a `Uint8Array`.
  *
  * @see {@link https://hono.dev/docs/api/request#bytes}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.bytes()
  * })
  * ```
  */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
  * Parses the request body as a `Blob`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.blob();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#blob
  */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
  * Parses the request body as `FormData`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.formData();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#formdata
  */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
  * Adds validated data to the request.
  *
  * @param target - The target of the validation.
  * @param data - The validated data to add.
  */
  addValidatedData(target, data) {
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
  * `.url` can get the request url strings.
  *
  * @see {@link https://hono.dev/docs/api/request#url}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const url = c.req.url // `http://localhost:8787/about/me`
  *   ...
  * })
  * ```
  */
  get url() {
    return this.raw.url;
  }
  /**
  * `.method` can get the method name of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#method}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const method = c.req.method // `GET`
  * })
  * ```
  */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
  * `.matchedRoutes` can return a matched route in the handler
  *
  * @deprecated
  *
  * Use matchedRoutes helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#matchedroutes}
  *
  * @example
  * ```ts
  * app.use('*', async function logger(c, next) {
  *   await next()
  *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
  *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
  *     console.log(
  *       method,
  *       ' ',
  *       path,
  *       ' '.repeat(Math.max(10 - path.length, 0)),
  *       name,
  *       i === c.req.routeIndex ? '<- respond from here' : ''
  *     )
  *   })
  * })
  * ```
  */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
  * `.routePath` can retrieve the path registered within the handler
  *
  * @deprecated
  *
  * Use routePath helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#routepath}
  *
  * @example
  * ```ts
  * app.get('/posts/:id', (c) => {
  *   return c.json({ path: c.req.routePath })
  * })
  * ```
  */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) str = str.toString();
    if (str instanceof Promise) str = await str;
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) return Promise.resolve(str);
  if (buffer) buffer[0] += str;
  else buffer = [str];
  const resStr = Promise.all(callbacks.map((c) => c({
    phase,
    buffer,
    context
  }))).then((res) => Promise.all(res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))).then(() => buffer[0]));
  if (preserveCallbacks) return raw(await resStr, callbacks);
  else return resStr;
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
  * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
  *
  * @see {@link https://hono.dev/docs/api/context#env}
  *
  * @example
  * ```ts
  * // Environment object for Cloudflare Workers
  * app.get('*', async c => {
  *   const counter = c.env.COUNTER
  * })
  * ```
  */
  env = {};
  #var;
  finalized = false;
  /**
  * `.error` can get the error object from the middleware if the Handler throws an error.
  *
  * @see {@link https://hono.dev/docs/api/context#error}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   await next()
  *   if (c.error) {
  *     // do something...
  *   }
  * })
  * ```
  */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
  * Creates an instance of the Context class.
  *
  * @param req - The Request object.
  * @param options - Optional configuration options for the context.
  */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
  * `.req` is the instance of {@link HonoRequest}.
  */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#event}
  * The FetchEvent associated with the current request.
  *
  * @throws Will throw an error if the context does not have a FetchEvent.
  */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no FetchEvent");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#executionctx}
  * The ExecutionContext associated with the current request.
  *
  * @throws Will throw an error if the context does not have an ExecutionContext.
  */
  get executionCtx() {
    if (this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no ExecutionContext");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#res}
  * The Response object for the current request.
  */
  get res() {
    return this.#res ||= createResponseInstance(null, { headers: this.#preparedHeaders ??= new Headers() });
  }
  /**
  * Sets the Response object for the current request.
  *
  * @param _res - The Response object to set.
  */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") continue;
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) _res.headers.append("set-cookie", cookie);
        } else _res.headers.set(k, v);
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
  * `.render()` can create a response within a layout.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   return c.render('Hello!')
  * })
  * ```
  */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
  * Sets the layout for the response.
  *
  * @param layout - The layout to set.
  * @returns The layout function.
  */
  setLayout = (layout) => this.#layout = layout;
  /**
  * Gets the current layout for the response.
  *
  * @returns The current layout function.
  */
  getLayout = () => this.#layout;
  /**
  * `.setRenderer()` can set the layout in the custom middleware.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```tsx
  * app.use('*', async (c, next) => {
  *   c.setRenderer((content) => {
  *     return c.html(
  *       <html>
  *         <body>
  *           <p>{content}</p>
  *         </body>
  *       </html>
  *     )
  *   })
  *   await next()
  * })
  * ```
  */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
  * `.header()` can set headers.
  *
  * @see {@link https://hono.dev/docs/api/context#header}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *
  *   // Append multiple headers using the append option (e.g. Vary)
  *   c.header('Vary', 'Accept-Encoding', { append: true })
  *   c.header('Vary', 'User-Agent', { append: true })
  *
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  header = (name, value, options) => {
    if (this.finalized && !this.#res.bodyUsed) this.#res = createResponseInstance(this.#res.body, this.#res);
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) headers.delete(name);
    else if (options?.append) headers.append(name, value);
    else headers.set(name, value);
  };
  status = (status) => {
    this.#status = status;
  };
  /**
  * `.set()` can set the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   c.set('message', 'Hono is hot!!')
  *   await next()
  * })
  * ```
  */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
  * `.get()` can use the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   const message = c.get('message')
  *   return c.text(`The message is "${message}"`)
  * })
  * ```
  */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
  * `.var` can access the value of a variable.
  *
  * @see {@link https://hono.dev/docs/api/context#var}
  *
  * @example
  * ```ts
  * const result = c.var.client.oneMethod()
  * ```
  */
  get var() {
    if (!this.#var) return {};
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) if (key === "set-cookie") responseHeaders.append(key, value);
      else responseHeaders.set(key, value);
    }
    if (headers) {
      if (!responseHeaders) {
        let count = 0;
        for (const k in headers) if (++count > 1 || typeof headers[k] !== "string") {
          responseHeaders = new Headers();
          break;
        }
      }
      if (responseHeaders) for (const k in headers) {
        const v = headers[k];
        if (typeof v === "string") responseHeaders.set(k, v);
        else {
          responseHeaders.delete(k);
          for (const v2 of v) responseHeaders.append(k, v2);
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
  * `.body()` can return the HTTP response.
  * You can set headers with `.header()` and set HTTP status code with `.status`.
  * This can also be set in `.text()`, `.json()` and so on.
  *
  * @see {@link https://hono.dev/docs/api/context#body}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *   // Set HTTP status code
  *   c.status(201)
  *
  *   // Return the response body
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
  * `.text()` can render text as `Content-Type:text/plain`.
  *
  * @see {@link https://hono.dev/docs/api/context#text}
  *
  * @example
  * ```ts
  * app.get('/say', (c) => {
  *   return c.text('Hello!')
  * })
  * ```
  */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(text, arg, setDefaultContentType(TEXT_PLAIN, headers));
  };
  /**
  * `.json()` can render JSON as `Content-Type:application/json`.
  *
  * @see {@link https://hono.dev/docs/api/context#json}
  *
  * @example
  * ```ts
  * app.get('/api', (c) => {
  *   return c.json({ message: 'Hello!' })
  * })
  * ```
  */
  json = (object, arg, headers) => {
    return this.#newResponse(JSON.stringify(object), arg, setDefaultContentType("application/json", headers));
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
  * `.redirect()` can Redirect, default status code is 302.
  *
  * @see {@link https://hono.dev/docs/api/context#redirect}
  *
  * @example
  * ```ts
  * app.get('/redirect', (c) => {
  *   return c.redirect('/')
  * })
  * app.get('/redirect-permanently', (c) => {
  *   return c.redirect('/', 301)
  * })
  * ```
  */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header("Location", !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString));
    return this.newResponse(null, status ?? 302);
  };
  /**
  * `.notFound()` can return the Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/context#notfound}
  *
  * @example
  * ```ts
  * app.get('/notfound', (c) => {
  *   return c.notFound()
  * })
  * ```
  */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else handler = i === middleware.length && next || void 0;
      if (handler) try {
        res = await handler(context, () => dispatch(i + 1));
      } catch (err) {
        if (err instanceof Error && onError) {
          context.error = err;
          res = await onError(err, context);
          isError = true;
        } else throw err;
      }
      else if (context.finalized === false && onNotFound) res = await onNotFound(context);
      if (res && (context.finalized === false || isError)) context.res = res;
      return context;
    }
  };
};

// node_modules/hono/dist/router.js
var METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "options",
  "patch",
  "query"
];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/utils/mount.js
var getPathPrefixLength = (c, pathPrefix, routePath) => {
  if (!/[:*]/.test(pathPrefix)) return pathPrefix.length;
  const path = c.req.path;
  const matchResult = c.req[GET_MATCH_RESULT];
  const paramNames = /* @__PURE__ */ new Set();
  let length = 0;
  for (const part of splitRoutingPath(pathPrefix)) {
    const pattern = getPattern(part);
    if (pattern && pattern !== "*") {
      const name = pattern[1];
      if (paramNames.has(name)) throw new Error(`mount(): Duplicate path parameter "${name}" in "${routePath}".`);
      paramNames.add(name);
    }
    if (pattern && pattern !== "*" && pattern[2] !== true) {
      const value = matchResult.length === 2 ? matchResult[1][matchResult[0][c.req.routeIndex][1][pattern[1]]] : matchResult[0][c.req.routeIndex][1][pattern[1]];
      length += value.length + 1;
    } else if (pattern || part.endsWith("*")) {
      const end = path.indexOf("/", length + 1);
      length = end === -1 ? path.length : end;
    } else length += part.length + 1;
  }
  return length;
};
var createMountedRequest = (c, pathPrefix, routePath) => {
  if (/[^/]\*$/.test(routePath)) throw new Error(`mount(): Wildcard must follow "/" in "${routePath}".`);
  const url = new URL(c.req.raw.url);
  url.pathname = stripPathPrefix(url.pathname, c.req.path, getPathPrefixLength(c, pathPrefix, routePath));
  return new Request(url, c.req.raw);
};

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class Hono2 {
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    [...METHODS, "all"].forEach((method) => {
      this[method] = (args1, ...args) => {
        const methodName = method.toUpperCase();
        if (typeof args1 === "string") this.#path = args1;
        else this.#addRoute(methodName, this.#path, args1);
        args.forEach((handler) => {
          this.#addRoute(methodName, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          const methodName = m.toUpperCase();
          for (const handler of handlers) this.#addRoute(methodName, this.#path, handler);
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") this.#path = arg1;
      else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute("ALL", this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono2({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  /**
  * `.route()` allows grouping other Hono instance in routes.
  *
  * @see {@link https://hono.dev/docs/api/routing#grouping}
  *
  * @param {string} path - base Path
  * @param {Hono} app - other Hono instance
  * @returns {Hono} routed Hono instance
  *
  * @example
  * ```ts
  * const app = new Hono()
  * const app2 = new Hono()
  *
  * app2.get("/user", (c) => c.text("user"))
  * app.route("/api", app2) // GET /api/user
  * ```
  */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) handler = r.handler;
      else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
  * `.basePath()` allows base paths to be specified.
  *
  * @see {@link https://hono.dev/docs/api/routing#base-path}
  *
  * @param {string} path - base Path
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * const api = new Hono().basePath('/api')
  * ```
  */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
  * `.onError()` handles an error and returns a customized Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#error-handling}
  *
  * @param {ErrorHandler} handler - request Handler for error
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.onError((err, c) => {
  *   console.error(`${err}`)
  *   return c.text('Custom Error Message', 500)
  * })
  * ```
  */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
  * `.notFound()` allows you to customize a Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#not-found}
  *
  * @param {NotFoundHandler} handler - request handler for not-found
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.notFound((c) => {
  *   return c.text('Custom 404 Message', 404)
  * })
  * ```
  */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
  * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
  *
  * @deprecated Use `mount()` from `hono/mount` instead. `.mount()` will be removed in v5.
  *
  * @see {@link https://hono.dev/docs/api/hono#mount}
  *
  * @param {string} path - base Path
  * @param {Function} applicationHandler - other Request Handler
  * @param {MountOptions} [options] - options of `.mount()`
  * @returns {Hono} mounted Hono instance
  *
  * @example
  * ```ts
  * import { Router as IttyRouter } from 'itty-router'
  * import { Hono } from 'hono'
  * // Create itty-router application
  * const ittyRouter = IttyRouter()
  * // GET /itty-router/hello
  * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
  *
  * const app = new Hono()
  * app.mount('/itty-router', ittyRouter.handle)
  * ```
  *
  * @example
  * ```ts
  * const app = new Hono()
  * // Send the request to another application without modification.
  * app.mount('/app', anotherApp, {
  *   replaceRequest: (req) => req,
  * })
  * ```
  */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") optionHandler = options;
      else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) replaceRequest = (request) => request;
        else replaceRequest = options.replaceRequest;
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    const mergedPath = mergePath(this._basePath, path);
    const defaultReplaceRequest = (c) => createMountedRequest(c, mergedPath.replace(/\/$/, ""), mergePath(mergedPath, "*"));
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest ? replaceRequest(c.req.raw) : defaultReplaceRequest(c), ...getOptions(c));
      if (res) return res;
      await next();
    };
    this.#addRoute("ALL", mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) return this.errorHandler(err, c);
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then((resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
  * `.fetch()` will be entry point of your app.
  *
  * @see {@link https://hono.dev/docs/api/hono#fetch}
  *
  * @param {Request} request - request Object of request
  * @param {Env} env - env Object
  * @param {ExecutionContext} executionCtx - context of execution
  * @returns {Response | Promise<Response>} response of request
  *
  */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
  * `.request()` is a useful method for testing.
  * You can pass a URL or pathname to send a GET request.
  * app will return a Response object.
  * ```ts
  * test('GET /hello is ok', async () => {
  *   const res = await app.request('/hello')
  *   expect(res.status).toBe(200)
  * })
  * ```
  * @see https://hono.dev/docs/api/hono#request
  */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    input = input.toString();
    return this.fetch(new Request(/^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`, requestInit), Env, executionCtx);
  };
  /**
  * `.fire()` automatically adds a global fetch event listener.
  * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
  * @deprecated
  * Use `fire` from `hono/service-worker` instead.
  * ```ts
  * import { Hono } from 'hono'
  * import { fire } from 'hono/service-worker'
  *
  * const app = new Hono()
  * // ...
  * fire(app)
  * ```
  * @see https://hono.dev/docs/api/hono#fire
  * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
  * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
  */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/utils.js
var createNullObject = () => /* @__PURE__ */ Object.create(null);

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = ((method2, path2) => {
    const matcher = matchers[method2] || matchers["ALL"];
    const staticMatch = matcher[2][path2];
    if (staticMatch) return staticMatch;
    const match3 = path2.match(matcher[0]);
    if (!match3) return [[], emptyParam];
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  });
  this.match = match2;
  return match2(method, path);
}

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = "[^]*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/[^]*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = /* @__PURE__ */ new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) return b.length === 1 ? a < b ? -1 : 1 : -1;
  if (b.length === 1) return 1;
  if (a === "[^]*" || a === "(?:|/[^]*)") return b === "[^]*" ? -1 : 1;
  else if (b === "[^]*" || b === "(?:|/[^]*)") return -1;
  if (a === "[^/]+") return 1;
  else if (b === "[^/]+") return -1;
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class Node2 {
  #index;
  #varIndex;
  #children = createNullObject();
  insert(tokens, index, paramMap, context, keys) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? [
        "",
        "",
        ONLY_WILDCARD_REG_EXP_STR
      ] : [
        "",
        "",
        LABEL_REG_EXP_STR
      ] : null : token === "/*" ? [
        "",
        "",
        TAIL_WILDCARD_REG_EXP_STR
      ] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || "[^/]+";
        if (name && pattern[2]) {
          if (new RegExp(regexpStr).test("")) throw PATH_ERROR;
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) throw PATH_ERROR;
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) throw PATH_ERROR;
        }
        keys.push(regexpStr);
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== "[^]*" && regexpStr !== "(?:|/[^]*)") {
            for (const k in node.#children) if ((regexpStr.length > 1 || k.length > 1) && k !== "[^]*" && k !== "(?:|/[^]*)") throw PATH_ERROR;
          }
          nextNode = node.#children[regexpStr] = new Node2();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        keys.push(token);
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) if (k.length > 1 && k !== "[^]*" && k !== "(?:|/[^]*)") throw PATH_ERROR;
          nextNode = node.#children[token] = new Node2();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) throw PATH_ERROR;
    node.#index = index;
  }
  buildRegExpStr() {
    const strList = Object.keys(this.#children).sort(compareKey).map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) strList.unshift(`#${this.#index}`);
    if (strList.length === 0) return "";
    if (strList.length === 1) return strList[0];
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  paths = createNullObject();
  insert(path, isStatic) {
    const keys = [];
    if (isStatic) {
      this.#root.insert(path.split(""), -1, [], this.#context, keys);
      this.paths[path] = [
        -1,
        [],
        keys
      ];
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{(?:\{[\d,]+\}|[^}])+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) break;
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./gs) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) if (tokens[j].indexOf(mark) !== -1) {
        tokens[j] = tokens[j].replace(mark, groups[i][1]);
        break;
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, keys);
    this.paths[path] = [
      this.#index++,
      paramAssoc,
      keys
    ];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") return [
      /^$/,
      [],
      []
    ];
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [
      new RegExp(`^${regexp}`),
      indexReplacementMap,
      paramReplacementMap
    ];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
function endsWithWildcard(keys) {
  const tail = keys[keys.length - 1];
  return tail === "[^]*" || tail === "(?:|/[^]*)";
}
function covers(wildcard, target) {
  const last = wildcard.length - 1;
  for (let i = 0; i < last; i++) if (wildcard[i] !== target[i]) return false;
  return wildcard[last] === "[^]*" || target.length === last || target[last] === "/";
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #handlers;
  #tries;
  constructor() {
    this.#handlers = { ["ALL"]: [] };
    this.#tries = { ["ALL"]: new Trie() };
  }
  #insertPath(method, path) {
    try {
      this.#tries[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }
  add(method, path, handler) {
    const handlers = this.#handlers;
    if (!handlers) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    const tries = this.#tries;
    if (!handlers[method]) {
      tries[method] = new Trie();
      handlers[method] = [...handlers["ALL"]];
      for (const p in tries["ALL"].paths) this.#insertPath(method, p);
    }
    if (path === "/*") path = "*";
    const methods = method === "ALL" ? Object.keys(handlers) : [method];
    const paths = checkOptionalParameter(path) || [path];
    for (const path2 of paths) for (const m of methods) {
      if (!tries[m].paths[path2]) this.#insertPath(m, path2);
      handlers[m].push([handler, path2]);
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = createNullObject();
    for (const method of Object.keys(this.#handlers)) matchers[method] = this.#buildMatcher(method);
    this.#handlers = this.#tries = void 0;
    return matchers;
  }
  #buildMatcher(method) {
    const handlers = this.#handlers[method];
    const trie = this.#tries[method];
    const staticMap = createNullObject();
    const handlerData = [];
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    const own = createNullObject();
    const entries = handlers.map(([h, p], i) => {
      (own[p] ??= []).push(i);
      return [h, trie.paths[p][1].reduceRight((map, [key, varIndex]) => {
        map[key] = paramReplacementMap[varIndex];
        return map;
      }, createNullObject())];
    });
    const wildcards = Object.keys(own).filter((p) => endsWithWildcard(trie.paths[p][2]));
    for (const path in trie.paths) {
      const [index, , keys] = trie.paths[path];
      const indexes = [...own[path]];
      for (const p of wildcards) if (p !== path && covers(trie.paths[p][2], keys)) indexes.push(...own[p]);
      const data = indexes.sort((a, b) => a - b).map((i) => entries[i]);
      if (index === -1) {
        const last = Math.max(-1, ...data.flatMap(([, map]) => Object.values(map)));
        staticMap[path] = [data, last === -1 ? emptyParam : path.match(regexp).slice(0, last + 1)];
      } else handlerData[index] = data;
    }
    return [
      regexp,
      indexReplacementMap.map((i) => handlerData[i]),
      staticMap
    ];
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    this.#routes.push([
      method,
      path,
      handler
    ]);
  }
  match(method, path) {
    if (!this.#routes) throw new Error("Fatal error");
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) router.add(...routes[i2]);
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) continue;
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) throw new Error("Fatal error");
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) throw new Error("No active router has been determined yet.");
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = createNullObject();
var order = 0;
var Node3 = class Node4 {
  #methods = [];
  #children = createNullObject();
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path, handler) {
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new Node4();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) possibleKeys.add(pattern[1]);
    }
    curNode.#methods.push({ [method]: {
      handler,
      possibleKeys: [...possibleKeys],
      score: ++order
    } });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m["ALL"];
      if (handlerSet) {
        handlerSet.params = createNullObject();
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    let curNodes = [this];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else tempNodes.push(nextNode);
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) continue;
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              if (!Object.hasOwn(params, name)) params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, node.#params, params);
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                (curNodesQueue[componentCount] ||= []).push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            if (!Object.hasOwn(params, name)) params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, params, node.#params);
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) handlerSets.sort((a, b) => {
      return a.score - b.score;
    });
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node = new Node3();
  add(method, path, handler) {
    for (const result of checkOptionalParameter(path) || [path]) this.#node.insert(method, result, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono3 = class extends Hono {
  /**
  * Creates an instance of the Hono class.
  *
  * @param options - Optional configuration options for the Hono instance.
  */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = (options) => {
  const opts = {
    origin: "*",
    allowMethods: [
      "GET",
      "HEAD",
      "PUT",
      "POST",
      "DELETE",
      "PATCH",
      "QUERY"
    ],
    allowHeaders: [],
    exposeHeaders: [],
    ...options
  };
  const exposeHeadersStr = opts.exposeHeaders?.length ? opts.exposeHeaders.join(",") : void 0;
  const allowHeadersStr = opts.allowHeaders?.length ? opts.allowHeaders.join(",") : void 0;
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") return () => optsOrigin;
      else return (origin) => optsOrigin === origin ? origin : null;
    } else if (typeof optsOrigin === "function") return optsOrigin;
    else return (origin) => optsOrigin.includes(origin) ? origin : null;
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") return async (origin, c) => (await optsAllowMethods(origin, c)).join(",");
    else if (Array.isArray(optsAllowMethods)) {
      const methodsStr = optsAllowMethods.join(",");
      return () => methodsStr;
    } else return () => "";
  })(opts.allowMethods);
  return async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) set("Access-Control-Allow-Origin", allowOrigin);
    if (opts.credentials) set("Access-Control-Allow-Credentials", "true");
    if (exposeHeadersStr) set("Access-Control-Expose-Headers", exposeHeadersStr);
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") c.res.headers.append("Vary", "Origin");
      if (opts.maxAge != null) set("Access-Control-Max-Age", opts.maxAge.toString());
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods) set("Access-Control-Allow-Methods", allowMethods);
      let headersStr = allowHeadersStr;
      if (!headersStr) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) headersStr = requestHeaders.split(",").map((h) => h.trim()).join(",");
      }
      if (headersStr) {
        set("Access-Control-Allow-Headers", headersStr);
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") c.header("Vary", "Origin", { append: true });
  };
};

// src/utils/response.ts
function generateRequestId() {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
function sendSuccess(c, data, message = "success", status = 200) {
  const requestId = generateRequestId();
  c.header("X-Omisell-Request-ID", requestId);
  return c.json(
    {
      code: status,
      message,
      data,
      error: false,
      error_code: status,
      attr_error: null,
      messages: "",
      request_id: requestId
    },
    status
  );
}
function sendError(c, message, status = 400, attrError = null) {
  const requestId = generateRequestId();
  c.header("X-Omisell-Request-ID", requestId);
  return c.json(
    {
      code: status,
      message,
      data: null,
      error: true,
      error_code: status,
      attr_error: attrError,
      messages: message,
      request_id: requestId
    },
    status
  );
}

// src/routes/auth.ts
var authRouter = new Hono3();
var createTokenPayload = () => {
  const now = Math.floor(Date.now() / 1e3);
  const token = "mock_jwt_token_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMjM0NSwic2VsbGVyX2lkIjoiU0VMTEVSXzAwMSIsImV4cCI6MTc5Mzc4ODgwMH0";
  const refreshToken = "mock_refresh_token_789xyz123abc456";
  return {
    token,
    access_token: token,
    refresh_token: refreshToken,
    expired_time: now + 86400,
    refresh_expired_time: now + 86400 * 15,
    expires_in: 86400,
    token_type: "Bearer",
    seller_id: 27001999
  };
};
authRouter.post("/oauth/access_token", (c) => {
  return sendSuccess(c, createTokenPayload());
});
authRouter.post("/oauth/refresh_token", (c) => {
  return sendSuccess(c, createTokenPayload());
});
authRouter.post("/token/get", (c) => {
  return sendSuccess(c, createTokenPayload());
});
authRouter.post("/token/get/", (c) => {
  return sendSuccess(c, createTokenPayload());
});
authRouter.post("/token/refresh", (c) => {
  return sendSuccess(c, createTokenPayload());
});
authRouter.post("/token/refresh/", (c) => {
  return sendSuccess(c, createTokenPayload());
});

// data/products.json
var products_default = [
  {
    product_id: 201,
    name: "B\xE1nh quy y\u1EBFn m\u1EA1ch 200g",
    sku: "11111111",
    esku: "11111111",
    barcode: "11111111",
    avatar: "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/banh_quy_yen_mach.png",
    images: [
      "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/banh_quy_yen_mach.png",
      "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/banh_quy_yen_mach_back.png"
    ],
    description: "<div>B\xE1nh quy y\u1EBFn m\u1EA1ch th\u01A1m ngon gi\xE0u dinh d\u01B0\u1EE1ng, \u0111\xF3ng h\u1ED9p 200g.</div>",
    category_id: 2,
    brand: 63174,
    brand_name: "Odoo Food",
    unit: 75745,
    unit_name: "\u0110\u01A1n v\u1ECB",
    cost: 25e3,
    sale_price: 35e3,
    declared_value: 35e3,
    currency: "VND",
    tax: 10,
    weight: 200,
    volume: "15x10x5",
    tag: "banh-quy-yen-mach",
    product_type: "physical",
    product_validation: null,
    is_active: true,
    is_bulky: false,
    is_dropship: false,
    is_hide_name: false,
    is_serial_number: 0,
    is_customize_packaging: 0,
    min_quantity: 1,
    eta_of_purchase: 3,
    last_active_time: 1785256482,
    price_by_2week: 0,
    value_by_2week: 0,
    reserved_by_flashsale: 0,
    stock: 50,
    stock_on_hand: 50,
    stock_buffer: 0,
    stock_committed: 0,
    stock_incoming: 20,
    stock_approve_shipment: 0,
    stock_on_shipment: 0,
    count_linked: 1,
    count_variant: 1,
    vendor_id: 27001999,
    vendor_product_id: null,
    vendor_product_sku: null,
    platforms: [
      {
        platform: "shopee",
        platform_name: "Shopee",
        shop_id: 11311,
        shop_name: "Trung Nguyen E-Store",
        listing_id: "100201",
        listing_sku: "11111111",
        stock: 50,
        price: 35e3
      }
    ],
    variants: [
      {
        variant_id: 20101,
        product_id: 201,
        name: "B\xE1nh quy y\u1EBFn m\u1EA1ch 200g - Chu\u1EA9n",
        sku: "11111111",
        esku: "11111111",
        barcode: "11111111",
        cost: 25e3,
        sale_price: 35e3,
        declared_value: 35e3,
        weight: 200,
        stock: 50,
        stock_on_hand: 50,
        options: []
      }
    ],
    created_time: 1785256482,
    updated_time: 1785420670
  },
  {
    product_id: 202,
    name: "B\u1ED9t cacao nguy\xEAn ch\u1EA5t 200g",
    sku: "3333",
    esku: "3333",
    barcode: "3333",
    avatar: "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/bot_cacao.png",
    images: [
      "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/bot_cacao.png"
    ],
    description: "<div>B\u1ED9t cacao nguy\xEAn ch\u1EA5t \u0110\u1EAFk L\u1EAFk kh\xF4ng \u0111\u01B0\u1EDDng, \u0111\xF3ng t\xFAi zip 200g.</div>",
    category_id: 2,
    brand: 63174,
    brand_name: "Odoo Food",
    unit: 75745,
    unit_name: "\u0110\u01A1n v\u1ECB",
    cost: 34e3,
    sale_price: 54e3,
    declared_value: 54e3,
    currency: "VND",
    tax: 10,
    weight: 200,
    volume: "10x5x15",
    tag: "cacao-nguyen-chat",
    product_type: "physical",
    product_validation: null,
    is_active: true,
    is_bulky: false,
    is_dropship: false,
    is_hide_name: false,
    is_serial_number: 0,
    is_customize_packaging: 0,
    min_quantity: 1,
    eta_of_purchase: 3,
    last_active_time: 1785256482,
    price_by_2week: 0,
    value_by_2week: 0,
    reserved_by_flashsale: 0,
    stock: 30,
    stock_on_hand: 30,
    stock_buffer: 0,
    stock_committed: 0,
    stock_incoming: 0,
    stock_approve_shipment: 0,
    stock_on_shipment: 0,
    count_linked: 1,
    count_variant: 1,
    vendor_id: 27001999,
    vendor_product_id: null,
    vendor_product_sku: null,
    platforms: [
      {
        platform: "shopee",
        platform_name: "Shopee",
        shop_id: 11311,
        shop_name: "Trung Nguyen E-Store",
        listing_id: "100202",
        listing_sku: "3333",
        stock: 30,
        price: 54e3
      }
    ],
    variants: [
      {
        variant_id: 20201,
        product_id: 202,
        name: "B\u1ED9t cacao nguy\xEAn ch\u1EA5t 200g - Chu\u1EA9n",
        sku: "3333",
        esku: "3333",
        barcode: "3333",
        cost: 34e3,
        sale_price: 54e3,
        declared_value: 54e3,
        weight: 200,
        stock: 30,
        stock_on_hand: 30,
        options: []
      }
    ],
    created_time: 1785256482,
    updated_time: 1785420670
  },
  {
    product_id: 203,
    name: "B\u1ED9t di\u1EBFp c\xE1 s\u1EA5y l\u1EA1nh 100g",
    sku: "DC01",
    esku: "DC01",
    barcode: "DC01",
    avatar: "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/diep_ca.png",
    images: [
      "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/diep_ca.png"
    ],
    description: "<div>B\u1ED9t di\u1EBFp c\xE1 s\u1EA5y l\u1EA1nh nguy\xEAn ch\u1EA5t gi\u1EEF tr\u1ECDn v\u1ECB v\xE0 vi ch\u1EA5t t\u1EF1 nhi\xEAn.</div>",
    category_id: 2,
    brand: 63174,
    brand_name: "Odoo Herbal",
    unit: 75745,
    unit_name: "\u0110\u01A1n v\u1ECB",
    cost: 0,
    sale_price: 1e3,
    declared_value: 1e3,
    currency: "VND",
    tax: 0,
    weight: 100,
    volume: "10x5x12",
    tag: "bot-diep-ca",
    product_type: "physical",
    product_validation: null,
    is_active: true,
    is_bulky: false,
    is_dropship: false,
    is_hide_name: false,
    is_serial_number: 0,
    is_customize_packaging: 0,
    min_quantity: 1,
    eta_of_purchase: 3,
    last_active_time: 1785256482,
    price_by_2week: 0,
    value_by_2week: 0,
    reserved_by_flashsale: 0,
    stock: 40,
    stock_on_hand: 40,
    stock_buffer: 0,
    stock_committed: 0,
    stock_incoming: 0,
    stock_approve_shipment: 0,
    stock_on_shipment: 0,
    count_linked: 1,
    count_variant: 1,
    vendor_id: 27001999,
    vendor_product_id: null,
    vendor_product_sku: null,
    platforms: [],
    variants: [],
    created_time: 1785256482,
    updated_time: 1785420670
  },
  {
    product_id: 204,
    name: "B\u1ED9t matcha Nh\u1EADt B\u1EA3n 50g",
    sku: "MATCHA01",
    esku: "MATCHA01",
    barcode: "MATCHA01",
    avatar: "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/matcha.png",
    images: [
      "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/matcha.png"
    ],
    description: "<div>B\u1ED9t tr\xE0 xanh matcha nh\u1EADp kh\u1EA9u Uji Nh\u1EADt B\u1EA3n d\xF9ng cho pha ch\u1EBF v\xE0 l\xE0m b\xE1nh.</div>",
    category_id: 2,
    brand: 63174,
    brand_name: "Odoo Tea",
    unit: 75745,
    unit_name: "\u0110\u01A1n v\u1ECB",
    cost: 0,
    sale_price: 1e3,
    declared_value: 1e3,
    currency: "VND",
    tax: 10,
    weight: 50,
    volume: "8x4x10",
    tag: "bot-matcha",
    product_type: "physical",
    product_validation: null,
    is_active: true,
    is_bulky: false,
    is_dropship: false,
    is_hide_name: false,
    is_serial_number: 0,
    is_customize_packaging: 0,
    min_quantity: 1,
    eta_of_purchase: 5,
    last_active_time: 1785256482,
    price_by_2week: 0,
    value_by_2week: 0,
    reserved_by_flashsale: 0,
    stock: 48,
    stock_on_hand: 48,
    stock_buffer: 0,
    stock_committed: 0,
    stock_incoming: 0,
    stock_approve_shipment: 0,
    stock_on_shipment: 0,
    count_linked: 1,
    count_variant: 1,
    vendor_id: 27001999,
    vendor_product_id: null,
    vendor_product_sku: null,
    platforms: [],
    variants: [],
    created_time: 1785256482,
    updated_time: 1785420670
  },
  {
    product_id: 205,
    name: "Chocolate s\u1EEFa h\u1EA1t \u0111i\u1EC1u 80g",
    sku: "CHOCO-MILK-80",
    esku: "CHOCO-MILK-80",
    barcode: "CHOCO-MILK-80",
    avatar: "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/choco_milk.png",
    images: [
      "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/choco_milk.png"
    ],
    description: "<div>Chocolate s\u1EEFa b\xE9o ng\u1EADy k\u1EBFt h\u1EE3p h\u1EA1t \u0111i\u1EC1u gi\xF2n tan.</div>",
    category_id: 2,
    brand: 63174,
    brand_name: "Odoo Sweet",
    unit: 75745,
    unit_name: "\u0110\u01A1n v\u1ECB",
    cost: 0,
    sale_price: 1e3,
    declared_value: 1e3,
    currency: "VND",
    tax: 10,
    weight: 80,
    volume: "10x2x5",
    tag: "choco-milk",
    product_type: "physical",
    product_validation: null,
    is_active: true,
    is_bulky: false,
    is_dropship: false,
    is_hide_name: false,
    is_serial_number: 0,
    is_customize_packaging: 0,
    min_quantity: 1,
    eta_of_purchase: 3,
    last_active_time: 1785256482,
    price_by_2week: 0,
    value_by_2week: 0,
    reserved_by_flashsale: 0,
    stock: 25,
    stock_on_hand: 25,
    stock_buffer: 0,
    stock_committed: 0,
    stock_incoming: 0,
    stock_approve_shipment: 0,
    stock_on_shipment: 0,
    count_linked: 1,
    count_variant: 1,
    vendor_id: 27001999,
    vendor_product_id: null,
    vendor_product_sku: null,
    platforms: [],
    variants: [],
    created_time: 1785256482,
    updated_time: 1785420670
  },
  {
    product_id: 206,
    name: "Chocolate \u0111en 70% cacao 80g",
    sku: "01920392108",
    esku: "01920392108",
    barcode: "01920392108",
    avatar: "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/choco_dark.png",
    images: [
      "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/choco_dark.png"
    ],
    description: "<div>Chocolate \u0111en 70% cacao \u0111\u1EADm \u0111\xE0 v\u1ECB nguy\xEAn b\u1EA3n t\u1ED1t cho tim m\u1EA1ch.</div>",
    category_id: 2,
    brand: 63174,
    brand_name: "Odoo Sweet",
    unit: 75745,
    unit_name: "\u0110\u01A1n v\u1ECB",
    cost: 0,
    sale_price: 1e3,
    declared_value: 1e3,
    currency: "VND",
    tax: 10,
    weight: 80,
    volume: "10x2x5",
    tag: "choco-dark",
    product_type: "physical",
    product_validation: null,
    is_active: true,
    is_bulky: false,
    is_dropship: false,
    is_hide_name: false,
    is_serial_number: 0,
    is_customize_packaging: 0,
    min_quantity: 1,
    eta_of_purchase: 3,
    last_active_time: 1785256482,
    price_by_2week: 0,
    value_by_2week: 0,
    reserved_by_flashsale: 0,
    stock: 20,
    stock_on_hand: 20,
    stock_buffer: 0,
    stock_committed: 0,
    stock_incoming: 0,
    stock_approve_shipment: 0,
    stock_on_shipment: 0,
    count_linked: 1,
    count_variant: 1,
    vendor_id: 27001999,
    vendor_product_id: null,
    vendor_product_sku: null,
    platforms: [],
    variants: [],
    created_time: 1785256482,
    updated_time: 1785420670
  },
  {
    product_id: 207,
    name: "M\xE1y t\xEDnh Dell Vostro 3020",
    sku: "DELL-V3020",
    esku: "DELL-V3020",
    barcode: "8931234567890",
    avatar: "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/dell_vostro_3020.png",
    images: [
      "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/dell_vostro_3020.png",
      "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/dell_vostro_3020_front.png",
      "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/dell_vostro_3020_back.png"
    ],
    description: "<div>M\xE1y t\xEDnh \u0111\u1ED3ng b\u1ED9 \u0111\u1EC3 b\xE0n Dell Vostro 3020 Tower Core i5 13400 / 8GB / 512GB SSD / Windows 11 Home.</div>",
    category_id: 1,
    brand: 63174,
    brand_name: "Dell",
    unit: 75745,
    unit_name: "\u0110\u01A1n v\u1ECB",
    cost: 125e5,
    sale_price: 15e6,
    declared_value: 15e6,
    currency: "VND",
    tax: 10,
    weight: 5e3,
    volume: "40x20x35",
    tag: "dell-vostro-3020",
    product_type: "physical",
    product_validation: null,
    is_active: true,
    is_bulky: true,
    is_dropship: false,
    is_hide_name: false,
    is_serial_number: 1,
    is_customize_packaging: 0,
    min_quantity: 1,
    eta_of_purchase: 7,
    last_active_time: 1785256482,
    price_by_2week: 0,
    value_by_2week: 0,
    reserved_by_flashsale: 0,
    stock: 13,
    stock_on_hand: 13,
    stock_buffer: 0,
    stock_committed: 0,
    stock_incoming: 5,
    stock_approve_shipment: 0,
    stock_on_shipment: 0,
    count_linked: 1,
    count_variant: 1,
    vendor_id: 27001999,
    vendor_product_id: null,
    vendor_product_sku: null,
    platforms: [
      {
        platform: "shopee",
        platform_name: "Shopee",
        shop_id: 11311,
        shop_name: "Trung Nguyen E-Store",
        listing_id: "100207",
        listing_sku: "DELL-V3020",
        stock: 13,
        price: 15e6
      }
    ],
    variants: [
      {
        variant_id: 20701,
        product_id: 207,
        name: "M\xE1y t\xEDnh Dell Vostro 3020 - Ti\xEAu chu\u1EA9n",
        sku: "DELL-V3020",
        esku: "DELL-V3020",
        barcode: "8931234567890",
        cost: 125e5,
        sale_price: 15e6,
        declared_value: 15e6,
        weight: 5e3,
        stock: 13,
        stock_on_hand: 13,
        options: []
      }
    ],
    created_time: 1785256482,
    updated_time: 1785420670
  },
  {
    product_id: 208,
    name: "B\xE1nh h\u1EA1t dinh d\u01B0\u1EE1ng 180g",
    sku: "8930001000035",
    esku: "8930001000035",
    barcode: "8930001000035",
    avatar: "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/banh_hat.png",
    images: [
      "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/banh_hat.png"
    ],
    description: "<div>B\xE1nh h\u1EA1t dinh d\u01B0\u1EE1ng granola k\u1EBFt h\u1EE3p h\u1EA1nh nh\xE2n, \xF3c ch\xF3 v\xE0 h\u1EA1t \u0111i\u1EC1u.</div>",
    category_id: 2,
    brand: 63174,
    brand_name: "Odoo Healthy",
    unit: 75745,
    unit_name: "\u0110\u01A1n v\u1ECB",
    cost: 0,
    sale_price: 1e3,
    declared_value: 1e3,
    currency: "VND",
    tax: 10,
    weight: 180,
    volume: "12x5x10",
    tag: "banh-hat-dinh-duong",
    product_type: "physical",
    product_validation: null,
    is_active: true,
    is_bulky: false,
    is_dropship: false,
    is_hide_name: false,
    is_serial_number: 0,
    is_customize_packaging: 0,
    min_quantity: 1,
    eta_of_purchase: 3,
    last_active_time: 1785256482,
    price_by_2week: 0,
    value_by_2week: 0,
    reserved_by_flashsale: 0,
    stock: 90,
    stock_on_hand: 90,
    stock_buffer: 0,
    stock_committed: 0,
    stock_incoming: 0,
    stock_approve_shipment: 0,
    stock_on_shipment: 0,
    count_linked: 1,
    count_variant: 1,
    vendor_id: 27001999,
    vendor_product_id: null,
    vendor_product_sku: null,
    platforms: [],
    variants: [],
    created_time: 1785256482,
    updated_time: 1785420670
  },
  {
    product_id: 209,
    name: "B\u1ED9t rau m\xE1 s\u1EA5y l\u1EA1nh 100g",
    sku: "BOT-RAU-MA",
    esku: "BOT-RAU-MA",
    barcode: "BOT-RAU-MA",
    avatar: "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/rau_ma.png",
    images: [
      "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/rau_ma.png"
    ],
    description: "<div>B\u1ED9t rau m\xE1 s\u1EA5y l\u1EA1nh nguy\xEAn ch\u1EA5t thanh m\xE1t gi\u1EA3i nhi\u1EC7t m\xF9a h\xE8.</div>",
    category_id: 2,
    brand: 63174,
    brand_name: "Odoo Herbal",
    unit: 75745,
    unit_name: "\u0110\u01A1n v\u1ECB",
    cost: 0,
    sale_price: 1e3,
    declared_value: 1e3,
    currency: "VND",
    tax: 0,
    weight: 100,
    volume: "10x5x12",
    tag: "bot-rau-ma",
    product_type: "physical",
    product_validation: null,
    is_active: true,
    is_bulky: false,
    is_dropship: false,
    is_hide_name: false,
    is_serial_number: 0,
    is_customize_packaging: 0,
    min_quantity: 1,
    eta_of_purchase: 3,
    last_active_time: 1785256482,
    price_by_2week: 0,
    value_by_2week: 0,
    reserved_by_flashsale: 0,
    stock: 15,
    stock_on_hand: 15,
    stock_buffer: 0,
    stock_committed: 0,
    stock_incoming: 0,
    stock_approve_shipment: 0,
    stock_on_shipment: 0,
    count_linked: 1,
    count_variant: 1,
    vendor_id: 27001999,
    vendor_product_id: null,
    vendor_product_sku: null,
    platforms: [],
    variants: [],
    created_time: 1785256482,
    updated_time: 1785420670
  },
  {
    product_id: 210,
    name: "C\xE0 ph\xEA rang xay Robusta Bu\xF4n Ma Thu\u1ED9t 250g",
    sku: "CF-ROBUSTA-250",
    esku: "CF-ROBUSTA-250",
    barcode: "CF-ROBUSTA-250",
    avatar: "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/cf_robusta.png",
    images: [
      "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/cf_robusta.png"
    ],
    description: "<div>C\xE0 ph\xEA rang xay Robusta m\u1ED9c nguy\xEAn ch\u1EA5t h\u01B0\u01A1ng v\u1ECB \u0111\u1EADm \u0111\xE0 truy\u1EC1n th\u1ED1ng.</div>",
    category_id: 2,
    brand: 63174,
    brand_name: "Trung Nguyen",
    unit: 75745,
    unit_name: "\u0110\u01A1n v\u1ECB",
    cost: 0,
    sale_price: 1e3,
    declared_value: 1e3,
    currency: "VND",
    tax: 10,
    weight: 250,
    volume: "10x6x18",
    tag: "cf-robusta",
    product_type: "physical",
    product_validation: null,
    is_active: true,
    is_bulky: false,
    is_dropship: false,
    is_hide_name: false,
    is_serial_number: 0,
    is_customize_packaging: 0,
    min_quantity: 1,
    eta_of_purchase: 3,
    last_active_time: 1785256482,
    price_by_2week: 0,
    value_by_2week: 0,
    reserved_by_flashsale: 0,
    stock: 60,
    stock_on_hand: 60,
    stock_buffer: 0,
    stock_committed: 0,
    stock_incoming: 0,
    stock_approve_shipment: 0,
    stock_on_shipment: 0,
    count_linked: 1,
    count_variant: 1,
    vendor_id: 27001999,
    vendor_product_id: null,
    vendor_product_sku: null,
    platforms: [],
    variants: [],
    created_time: 1785256482,
    updated_time: 1785420670
  },
  {
    product_id: 211,
    name: "Ph\xED v\u1EADn chuy\u1EC3n c\u1EE7a s\xE0n",
    sku: "ECOM_SHIPPING_FEE",
    esku: "ECOM_SHIPPING_FEE",
    barcode: "ECOM_SHIPPING_FEE",
    avatar: "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/service_ship.png",
    images: [],
    description: "<div>D\u1ECBch v\u1EE5 c\u01B0\u1EDBc v\u1EADn chuy\u1EC3n s\xE0n th\u01B0\u01A1ng m\u1EA1i \u0111i\u1EC7n t\u1EED.</div>",
    category_id: 4,
    brand: 63174,
    brand_name: "Marketplace Service",
    unit: 75745,
    unit_name: "D\u1ECBch v\u1EE5",
    cost: 0,
    sale_price: 3e4,
    declared_value: 3e4,
    currency: "VND",
    tax: 10,
    weight: 0,
    volume: "0x0x0",
    tag: "ecom-shipping-fee",
    product_type: "service",
    product_validation: null,
    is_active: true,
    is_bulky: false,
    is_dropship: false,
    is_hide_name: false,
    is_serial_number: 0,
    is_customize_packaging: 0,
    min_quantity: 1,
    eta_of_purchase: 0,
    last_active_time: 1785256482,
    price_by_2week: 0,
    value_by_2week: 0,
    reserved_by_flashsale: 0,
    stock: 9999,
    stock_on_hand: 9999,
    stock_buffer: 0,
    stock_committed: 0,
    stock_incoming: 0,
    stock_approve_shipment: 0,
    stock_on_shipment: 0,
    count_linked: 1,
    count_variant: 0,
    vendor_id: 27001999,
    vendor_product_id: null,
    vendor_product_sku: null,
    platforms: [],
    variants: [],
    created_time: 1785256482,
    updated_time: 1785420670
  },
  {
    product_id: 212,
    name: "Gi\u1EA3m gi\xE1 khuy\u1EBFn m\xE3i",
    sku: "PROMO-DISCOUNT",
    esku: "PROMO-DISCOUNT",
    barcode: "PROMO-DISCOUNT",
    avatar: "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/service_discount.png",
    images: [],
    description: "<div>D\u1ECBch v\u1EE5 gi\u1EA3m gi\xE1 v\xE0 voucher t\xE0i ch\xEDnh s\xE0n.</div>",
    category_id: 4,
    brand: 63174,
    brand_name: "Marketplace Service",
    unit: 75745,
    unit_name: "D\u1ECBch v\u1EE5",
    cost: 0,
    sale_price: 0,
    declared_value: 0,
    currency: "VND",
    tax: 0,
    weight: 0,
    volume: "0x0x0",
    tag: "promo-discount",
    product_type: "service",
    product_validation: null,
    is_active: true,
    is_bulky: false,
    is_dropship: false,
    is_hide_name: false,
    is_serial_number: 0,
    is_customize_packaging: 0,
    min_quantity: 1,
    eta_of_purchase: 0,
    last_active_time: 1785256482,
    price_by_2week: 0,
    value_by_2week: 0,
    reserved_by_flashsale: 0,
    stock: 9999,
    stock_on_hand: 9999,
    stock_buffer: 0,
    stock_committed: 0,
    stock_incoming: 0,
    stock_approve_shipment: 0,
    stock_on_shipment: 0,
    count_linked: 1,
    count_variant: 0,
    vendor_id: 27001999,
    vendor_product_id: null,
    vendor_product_sku: null,
    platforms: [],
    variants: [],
    created_time: 1785256482,
    updated_time: 1785420670
  },
  {
    product_id: 213,
    name: "\u0110i\u1EC1u ch\u1EC9nh c\u1EE7a s\xE0n",
    sku: "ECOM_ADJUSTMENT",
    esku: "ECOM_ADJUSTMENT",
    barcode: "ECOM_ADJUSTMENT",
    avatar: "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/service_adjustment.png",
    images: [],
    description: "<div>D\u1ECBch v\u1EE5 \u0111i\u1EC1u ch\u1EC9nh ch\xEAnh l\u1EC7ch quy\u1EBFt to\xE1n s\xE0n.</div>",
    category_id: 4,
    brand: 63174,
    brand_name: "Marketplace Service",
    unit: 75745,
    unit_name: "D\u1ECBch v\u1EE5",
    cost: 0,
    sale_price: 0,
    declared_value: 0,
    currency: "VND",
    tax: 0,
    weight: 0,
    volume: "0x0x0",
    tag: "ecom-adjustment",
    product_type: "service",
    product_validation: null,
    is_active: true,
    is_bulky: false,
    is_dropship: false,
    is_hide_name: false,
    is_serial_number: 0,
    is_customize_packaging: 0,
    min_quantity: 1,
    eta_of_purchase: 0,
    last_active_time: 1785256482,
    price_by_2week: 0,
    value_by_2week: 0,
    reserved_by_flashsale: 0,
    stock: 9999,
    stock_on_hand: 9999,
    stock_buffer: 0,
    stock_committed: 0,
    stock_incoming: 0,
    stock_approve_shipment: 0,
    stock_on_shipment: 0,
    count_linked: 1,
    count_variant: 0,
    vendor_id: 27001999,
    vendor_product_id: null,
    vendor_product_sku: null,
    platforms: [],
    variants: [],
    created_time: 1785256482,
    updated_time: 1785420670
  },
  {
    product_id: 301,
    name: "S\u1EEFa r\u1EEDa m\u1EB7t b\xF9n kho\xE1ng 100ml",
    sku: "SRM-100",
    esku: "ERP-SRM-100",
    barcode: "SRM-100",
    avatar: "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/srm_100.png",
    images: [
      "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/srm_100.png"
    ],
    description: "<div>S\u1EEFa r\u1EEDa m\u1EB7t b\xF9n kho\xE1ng ki\u1EC1m d\u1EA7u ng\u1EEBa m\u1EE5n chai 100ml.</div>",
    category_id: 3,
    brand: 63174,
    brand_name: "Cosmetic Lab",
    unit: 75745,
    unit_name: "Chai",
    cost: 8e4,
    sale_price: 15e4,
    declared_value: 15e4,
    currency: "VND",
    tax: 10,
    weight: 100,
    volume: "5x5x15",
    tag: "srm-100",
    product_type: "physical",
    product_validation: null,
    is_active: true,
    is_bulky: false,
    is_dropship: false,
    is_hide_name: false,
    is_serial_number: 0,
    is_customize_packaging: 0,
    min_quantity: 1,
    eta_of_purchase: 3,
    last_active_time: 1785256482,
    price_by_2week: 0,
    value_by_2week: 0,
    reserved_by_flashsale: 0,
    stock: 100,
    stock_on_hand: 100,
    stock_buffer: 0,
    stock_committed: 0,
    stock_incoming: 0,
    stock_approve_shipment: 0,
    stock_on_shipment: 0,
    count_linked: 1,
    count_variant: 1,
    vendor_id: 27001999,
    vendor_product_id: null,
    vendor_product_sku: null,
    platforms: [],
    variants: [],
    created_time: 1785256482,
    updated_time: 1785420670
  },
  {
    product_id: 302,
    name: "N\u01B0\u1EDBc hoa h\u1ED3ng c\u1EA5p \u1EA9m 150ml",
    sku: "TONER-150",
    esku: "ERP-TONER-150",
    barcode: "TONER-150",
    avatar: "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/toner_150.png",
    images: [
      "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/toner_150.png"
    ],
    description: "<div>N\u01B0\u1EDBc hoa h\u1ED3ng c\xE2n b\u1EB1ng \u0111\u1ED9 \u1EA9m v\xE0 se kh\xEDt l\u1ED7 ch\xE2n l\xF4ng 150ml.</div>",
    category_id: 3,
    brand: 63174,
    brand_name: "Cosmetic Lab",
    unit: 75745,
    unit_name: "Chai",
    cost: 95e3,
    sale_price: 18e4,
    declared_value: 18e4,
    currency: "VND",
    tax: 10,
    weight: 150,
    volume: "5x5x18",
    tag: "toner-150",
    product_type: "physical",
    product_validation: null,
    is_active: true,
    is_bulky: false,
    is_dropship: false,
    is_hide_name: false,
    is_serial_number: 0,
    is_customize_packaging: 0,
    min_quantity: 1,
    eta_of_purchase: 3,
    last_active_time: 1785256482,
    price_by_2week: 0,
    value_by_2week: 0,
    reserved_by_flashsale: 0,
    stock: 100,
    stock_on_hand: 100,
    stock_buffer: 0,
    stock_committed: 0,
    stock_incoming: 0,
    stock_approve_shipment: 0,
    stock_on_shipment: 0,
    count_linked: 1,
    count_variant: 1,
    vendor_id: 27001999,
    vendor_product_id: null,
    vendor_product_sku: null,
    platforms: [],
    variants: [],
    created_time: 1785256482,
    updated_time: 1785420670
  },
  {
    product_id: 303,
    name: "S\u1EA3n ph\u1EA9m th\u1EED nghi\u1EC7m kh\xF4ng t\u1ED3n t\u1EA1i",
    sku: "UNKNOWN-ITEM-999",
    esku: "ERP-UNKNOWN-999",
    barcode: "UNKNOWN-ITEM-999",
    avatar: "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/unknown.png",
    images: [],
    description: "<div>S\u1EA3n ph\u1EA9m d\xF9ng ki\u1EC3m th\u1EED ngo\u1EA1i l\u1EC7 kh\xF4ng t\u1ED3n t\u1EA1i trong kho ERP.</div>",
    category_id: 3,
    brand: 63174,
    brand_name: "Test Brand",
    unit: 75745,
    unit_name: "\u0110\u01A1n v\u1ECB",
    cost: 0,
    sale_price: 99999,
    declared_value: 99999,
    currency: "VND",
    tax: 10,
    weight: 100,
    volume: "10x10x10",
    tag: "unknown-item",
    product_type: "physical",
    product_validation: null,
    is_active: true,
    is_bulky: false,
    is_dropship: false,
    is_hide_name: false,
    is_serial_number: 0,
    is_customize_packaging: 0,
    min_quantity: 1,
    eta_of_purchase: 0,
    last_active_time: 1785256482,
    price_by_2week: 0,
    value_by_2week: 0,
    reserved_by_flashsale: 0,
    stock: 0,
    stock_on_hand: 0,
    stock_buffer: 0,
    stock_committed: 0,
    stock_incoming: 0,
    stock_approve_shipment: 0,
    stock_on_shipment: 0,
    count_linked: 0,
    count_variant: 0,
    vendor_id: 27001999,
    vendor_product_id: null,
    vendor_product_sku: null,
    platforms: [],
    variants: [],
    created_time: 1785256482,
    updated_time: 1785420670
  }
];

// data/categories.json
var categories_default = [
  {
    category_id: 1,
    name: "Thi\u1EBFt b\u1ECB c\xF4ng ngh\u1EC7 & M\xE1y t\xEDnh",
    name_locale: "Thi\u1EBFt b\u1ECB c\xF4ng ngh\u1EC7 & M\xE1y t\xEDnh",
    parent_id: null,
    image: "https://storage.googleapis.com/omisell-cloud/category/tech.png",
    is_active: true
  },
  {
    category_id: 11,
    name: "M\xE1y t\xEDnh \u0111\u1ED3ng b\u1ED9",
    name_locale: "M\xE1y t\xEDnh \u0111\u1ED3ng b\u1ED9",
    parent_id: 1,
    image: null,
    is_active: true
  },
  {
    category_id: 2,
    name: "Th\u1EF1c ph\u1EA9m & \u0110\u1ED3 u\u1ED1ng",
    name_locale: "Th\u1EF1c ph\u1EA9m & \u0110\u1ED3 u\u1ED1ng",
    parent_id: null,
    image: "https://storage.googleapis.com/omisell-cloud/category/food.png",
    is_active: true
  },
  {
    category_id: 21,
    name: "B\xE1nh k\u1EB9o & H\u1EA1t dinh d\u01B0\u1EE1ng",
    name_locale: "B\xE1nh k\u1EB9o & H\u1EA1t dinh d\u01B0\u1EE1ng",
    parent_id: 2,
    image: null,
    is_active: true
  },
  {
    category_id: 22,
    name: "Tr\xE0, C\xE0 ph\xEA & B\u1ED9t dinh d\u01B0\u1EE1ng",
    name_locale: "Tr\xE0, C\xE0 ph\xEA & B\u1ED9t dinh d\u01B0\u1EE1ng",
    parent_id: 2,
    image: null,
    is_active: true
  },
  {
    category_id: 3,
    name: "Ch\u0103m s\xF3c da & L\xE0m \u0111\u1EB9p",
    name_locale: "Ch\u0103m s\xF3c da & L\xE0m \u0111\u1EB9p",
    parent_id: null,
    image: "https://storage.googleapis.com/omisell-cloud/category/cosmetics.png",
    is_active: true
  },
  {
    category_id: 4,
    name: "D\u1ECBch v\u1EE5 & Ph\u1EE5 ph\xED t\xE0i ch\xEDnh",
    name_locale: "D\u1ECBch v\u1EE5 & Ph\u1EE5 ph\xED t\xE0i ch\xEDnh",
    parent_id: null,
    image: null,
    is_active: true
  }
];

// src/routes/products.ts
var productsRouter = new Hono3();
var products = products_default;
productsRouter.get("/list", (c) => {
  const page = Math.max(1, Number(c.req.query("page") || 1));
  const pageSize = Math.min(50, Math.max(1, Number(c.req.query("page_size") || 25)));
  const keyword = (c.req.query("keyword") || "").trim().toLowerCase();
  let filtered = products;
  if (keyword) {
    filtered = products.filter(
      (p) => p.name.toLowerCase().includes(keyword) || p.sku.toLowerCase().includes(keyword) || p.barcode.toLowerCase().includes(keyword) || p.esku.toLowerCase().includes(keyword)
    );
  }
  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);
  const totalCount = filtered.length;
  const baseUrl = c.req.url.split("?")[0];
  const nextPage = start + pageSize < totalCount ? `${baseUrl}?page=${page + 1}&page_size=${pageSize}` : null;
  const prevPage = page > 1 ? `${baseUrl}?page=${page - 1}&page_size=${pageSize}` : null;
  const results = paginated.map((p) => ({
    avatar: p.avatar,
    product_id: p.product_id,
    vendor_id: p.vendor_id,
    vendor_product_id: p.vendor_product_id,
    vendor_product_sku: p.vendor_product_sku,
    name: p.name,
    sku: p.sku,
    esku: p.esku,
    unit_name: p.unit_name,
    category_id: p.category_id,
    cost: p.cost,
    sale_price: p.sale_price,
    declared_value: p.declared_value,
    tax: p.tax,
    currency: p.currency,
    weight: p.weight,
    volume: p.volume,
    images: p.images,
    created_time: p.created_time,
    updated_time: p.updated_time,
    count_variant: p.count_variant
  }));
  return sendSuccess(c, {
    count: totalCount,
    next: nextPage,
    previous: prevPage,
    results
  });
});
productsRouter.get("/category", (c) => {
  const parentIdParam = c.req.query("parent_category_id");
  const keyword = (c.req.query("keyword") || "").trim().toLowerCase();
  let filtered = categories_default;
  if (parentIdParam !== void 0) {
    const parentId = Number(parentIdParam) || null;
    filtered = filtered.filter((cat) => cat.parent_id === parentId);
  }
  if (keyword) {
    filtered = filtered.filter(
      (cat) => cat.name.toLowerCase().includes(keyword) || cat.name_locale.toLowerCase().includes(keyword)
    );
  }
  return sendSuccess(c, {
    count: filtered.length,
    next: null,
    previous: null,
    results: filtered
  });
});
productsRouter.get("/sku/:sku", (c) => {
  const sku = c.req.param("sku");
  const matched = products.find(
    (p) => p.sku.toLowerCase() === sku.toLowerCase() || p.barcode.toLowerCase() === sku.toLowerCase() || p.esku.toLowerCase() === sku.toLowerCase()
  );
  if (!matched) {
    return sendError(c, `Product SKU ${sku} not found`, 404);
  }
  return sendSuccess(c, matched);
});
productsRouter.get("/:product_id", (c) => {
  const productId = Number(c.req.param("product_id"));
  const matched = products.find((p) => p.product_id === productId);
  if (!matched) {
    return sendError(c, `Product ID ${productId} not found`, 404);
  }
  return sendSuccess(c, matched);
});
productsRouter.post("/add", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const newProduct = {
    product_id: Date.now(),
    name: body.name || "S\u1EA3n ph\u1EA9m m\u1EDBi t\u1EA1o",
    sku: body.sku || `SKU-${Date.now()}`,
    esku: body.esku || body.sku || `ERP-${Date.now()}`,
    barcode: body.barcode || `${Date.now()}`,
    avatar: body.avatar || "https://storage.googleapis.com/omisell-cloud/uploads/1/file/vn/default.png",
    images: Array.isArray(body.images) ? body.images : [],
    description: body.description || "<div>M\xF4 t\u1EA3 s\u1EA3n ph\u1EA9m m\u1EDBi</div>",
    category_id: body.category_id || 1,
    brand: body.brand || 63174,
    brand_name: body.brand_name || "Th\u01B0\u01A1ng hi\u1EC7u \u0111\u1ED1i t\xE1c",
    unit: 75745,
    unit_name: body.unit_name || "\u0110\u01A1n v\u1ECB",
    cost: Number(body.cost) || 0,
    sale_price: Number(body.sale_price) || 0,
    declared_value: Number(body.declared_value) || Number(body.sale_price) || 0,
    tax: body.tax !== void 0 ? Number(body.tax) : 10,
    currency: body.currency || "VND",
    weight: Number(body.weight) || 100,
    volume: body.volume || "10x10x10",
    tag: body.tag || "san-pham-moi",
    product_type: body.product_type || "physical",
    product_validation: null,
    is_active: true,
    is_bulky: false,
    is_dropship: false,
    is_hide_name: false,
    is_serial_number: 0,
    is_customize_packaging: 0,
    min_quantity: 1,
    eta_of_purchase: 3,
    last_active_time: Math.floor(Date.now() / 1e3),
    price_by_2week: 0,
    value_by_2week: 0,
    reserved_by_flashsale: 0,
    stock: Number(body.stock_quantity) || 10,
    stock_on_hand: Number(body.stock_quantity) || 10,
    stock_buffer: 0,
    stock_committed: 0,
    stock_incoming: 0,
    stock_approve_shipment: 0,
    stock_on_shipment: 0,
    count_linked: 0,
    count_variant: 0,
    vendor_id: 27001999,
    vendor_product_id: null,
    vendor_product_sku: null,
    platforms: [],
    variants: [],
    created_time: Math.floor(Date.now() / 1e3),
    updated_time: Math.floor(Date.now() / 1e3)
  };
  return sendSuccess(c, newProduct, "Product created successfully", 201);
});
productsRouter.post("/:product_id/update", async (c) => {
  const productId = Number(c.req.param("product_id"));
  const body = await c.req.json().catch(() => ({}));
  const matched = products.find((p) => p.product_id === productId);
  if (!matched) {
    return sendError(c, `Product ID ${productId} not found`, 404);
  }
  const updatedProduct = {
    ...matched,
    ...body,
    updated_time: Math.floor(Date.now() / 1e3)
  };
  return sendSuccess(c, updatedProduct, "Product updated successfully");
});
productsRouter.post("/inventory/adjust-stock", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const stocks = Array.isArray(body.stocks) ? body.stocks : [];
  const processedSkus = stocks.map((s) => s.sku || "UNKNOWN");
  return sendSuccess(
    c,
    {
      processed_skus: processedSkus,
      failed_skus: []
    },
    "Adjust stock in processing"
  );
});

// data/orders.json
var orders_default = {
  list: [
    {
      order_number: "DH-0001",
      omisell_order_number: "ODVN260805F24CA2C0",
      created_time: 1785915163,
      updated_time: 1785915222,
      escrow_release_time: 0,
      shop_id: 11311,
      status_id: 300,
      status_name: "\u0110\xE3 duy\u1EC7t",
      is_fulfilled: false,
      scenario: "mapped"
    },
    {
      order_number: "ORD-TEST-REAL-001",
      omisell_order_number: "ODVN2608REAL001",
      created_time: 1785746033,
      updated_time: 1785746034,
      escrow_release_time: 0,
      shop_id: 11311,
      status_id: 300,
      status_name: "\u0110\xE3 duy\u1EC7t",
      is_fulfilled: false,
      scenario: "mapped"
    },
    {
      order_number: "DH-UNMAPPED-01",
      omisell_order_number: "ODVN2608UNMAPPED",
      created_time: 1785915163,
      updated_time: 1785915222,
      escrow_release_time: 0,
      shop_id: 11311,
      status_id: 300,
      status_name: "\u0110\xE3 duy\u1EC7t",
      is_fulfilled: false,
      scenario: "unmapped"
    },
    {
      order_number: "DH-COD-01",
      omisell_order_number: "ODVN2608COD01",
      created_time: 1785915163,
      updated_time: 1785915222,
      escrow_release_time: 0,
      shop_id: 11311,
      status_id: 300,
      status_name: "\u0110\xE3 duy\u1EC7t",
      is_fulfilled: false,
      scenario: "cod"
    },
    {
      order_number: "DH-VOUCHER-01",
      omisell_order_number: "ODVN2608VOUCHER01",
      created_time: 1785915163,
      updated_time: 1785915222,
      escrow_release_time: 0,
      shop_id: 11311,
      status_id: 300,
      status_name: "\u0110\xE3 duy\u1EC7t",
      is_fulfilled: false,
      scenario: "voucher"
    },
    {
      order_number: "DH-CANCEL-01",
      omisell_order_number: "ODVN2608CANCEL01",
      created_time: 1785915163,
      updated_time: 1785915222,
      escrow_release_time: 0,
      shop_id: 11311,
      status_id: 900,
      status_name: "CANCELLED",
      is_fulfilled: false,
      scenario: "cancelled"
    }
  ],
  scenarios: {
    mapped: {
      completed_time: 0,
      created_time: 1785915163,
      escrow_release_time: 0,
      external_information: {
        cart_id: null,
        channel_buyer_id: "shopee_user_99182",
        channel_note: "Giao gi\u1EDD h\xE0nh ch\xEDnh"
      },
      fulfilled_time: 0,
      invoice_information: {
        code: "0312345678",
        company: "Trung Nguyen Corp",
        fullname: "Nguyen Van A",
        email: "buyer@example.com",
        phone: "0900000000",
        address: "123 Le Loi, Quan 1",
        zip_code: "700000",
        commune: "Ben Nghe",
        district: "Quan 1",
        province: "TP. Ho Chi Minh",
        country: "VN"
      },
      is_fulfilled: false,
      omisell_created_time: 1785915163,
      omisell_order_number: "ODVN260805F24CA2C0",
      order_note: "Giao gio hanh chinh - kiem tra dong bo san pham thuc te",
      order_number: "DH-0001",
      order_type: "normal",
      parcels: [
        {
          package_number: "1",
          pickup_id: 21,
          pickup_code: "PK100021",
          shipping_fee: 3e4,
          catalogue_items: [
            {
              order_item_id: 987654321,
              catalogue_sku: "DELL-V3020",
              product_name: "M\xE1y t\xEDnh Dell Vostro 3020",
              quantity: 1,
              weight: 5e3,
              original_price: 15e6,
              discounted_price: 15e6,
              is_gift: false,
              is_combo: false,
              discount_seller: 0,
              discount_platform: 0,
              voucher_seller: 0,
              voucher_platform: 0,
              warehouse_code: ""
            },
            {
              order_item_id: 987654324,
              catalogue_sku: "MATCHA01",
              product_name: "B\u1ED9t matcha Nh\u1EADt B\u1EA3n 50g",
              quantity: 2,
              weight: 50,
              original_price: 1e3,
              discounted_price: 1e3,
              is_gift: false,
              is_combo: false,
              discount_seller: 0,
              discount_platform: 0,
              voucher_seller: 0,
              voucher_platform: 0,
              warehouse_code: ""
            }
          ],
          inventory_items: [
            {
              order_item_id: 987654321,
              catalogue_sku: "DELL-V3020",
              inventory_sku: "DELL-V3020",
              esku: "DELL-V3020",
              product_name: "M\xE1y t\xEDnh Dell Vostro 3020",
              unit_name: "\u0110\u01A1n v\u1ECB",
              quantity: 1,
              sale_price: 15e6,
              sale_price_before_tax: 15e6,
              sale_amount: 15e6,
              invoice_lines: [
                {
                  quantity: 1,
                  unit_price_before_tax: 15e6,
                  unit_price_after_tax: 15e6,
                  amount_before_tax: 15e6,
                  vat_amount: 0,
                  total: 15e6
                }
              ],
              serial_numbers: [],
              tax_vat: 0,
              vendor_pickup_id: 21,
              vendor_pickup_code: "PK100021",
              vendor_name: "Trung Nguyen Corp",
              vendor_id: 27001999
            },
            {
              order_item_id: 987654324,
              catalogue_sku: "MATCHA01",
              inventory_sku: "MATCHA01",
              esku: "MATCHA01",
              product_name: "B\u1ED9t matcha Nh\u1EADt B\u1EA3n 50g",
              unit_name: "\u0110\u01A1n v\u1ECB",
              quantity: 2,
              sale_price: 1e3,
              sale_price_before_tax: 1e3,
              sale_amount: 2e3,
              invoice_lines: [
                {
                  quantity: 2,
                  unit_price_before_tax: 1e3,
                  unit_price_after_tax: 1e3,
                  amount_before_tax: 2e3,
                  vat_amount: 0,
                  total: 2e3
                }
              ],
              serial_numbers: [],
              tax_vat: 0,
              vendor_pickup_id: 21,
              vendor_pickup_code: "PK100021",
              vendor_name: "Trung Nguyen Corp",
              vendor_id: 27001999
            }
          ]
        }
      ],
      payment_information: [
        {
          origin_payment_method: "ShopeePay",
          payment_method: "2",
          payment_method_name: "Thanh to\xE1n tr\u1EF1c tuy\u1EBFn (ShopeePay)",
          transaction_amount: 15032e3,
          transaction_status: 200,
          transaction_status_name: "\u0110\xE3 thanh to\xE1n",
          transaction_code: "PV260805AB6990AC",
          transaction_external_code: "EXT-TXN-00129",
          transaction_reference: "REF-SHOPEE-991",
          transaction_time: 1785915164,
          transaction_note: "Thanh toan vi ShopeePay thanh cong"
        }
      ],
      platform: "shopee",
      platform_name: "Shopee",
      receiver: {
        fullname: "Nguyen Van A",
        email: "buyer@example.com",
        phone: "0900000000",
        address: "123 Le Loi, Quan 1",
        country: "VN",
        zip_code: "700000",
        province: "TP. H\u1ED3 Ch\xED Minh",
        province_id: 466617,
        district: "Qu\u1EADn 1",
        district_id: 1,
        subdistrict_name: "B\u1EBFn Ngh\xE9",
        subdistrict_id: 1
      },
      seller_id: 27001999,
      seller_voucher_code: [],
      shipped_time: 0,
      shipping_information: {
        origin_shipping_fee: 3e4,
        buyer_shipping_fee: 3e4,
        seller_shipping_fee: 0,
        platform_ship_rebate: 0,
        seller_ship_rebate: 0,
        wrong_weight_adjustment: 0
      },
      shop_id: 11311,
      shop_name: "Trung Nguyen E-Store",
      status_id: 300,
      status_name: "\u0110\xE3 duy\u1EC7t",
      updated_time: 1785915222,
      finance: {
        abnormal_buyer_shipping_fee: 0,
        adjustment_amount: 0,
        buyer_shipping_fee: 3e4,
        campaign_fee: 0,
        cod_amount: 0,
        cogs: 125e5,
        coin_discount: 0,
        commission_fee: 45e4,
        completed_time: 0,
        created_time: 1785915163,
        currency: "VND",
        discount_other: 0,
        discount_platform: 0,
        discount_seller: 0,
        discouted_sale_price: 15002e3,
        escrow_amount: 14552e3,
        escrow_time: 0,
        estimate_escrow_amount: 14552e3,
        expenses: 48e4,
        external_tracking_code: "SPX12345678VN",
        flexi_combo: 0,
        fsm_fee: 0,
        fulfill_fee: 0,
        fulfilled_time: 0,
        gross_sales: 15002e3,
        infrastructure_fee: 0,
        invoice_issue_time: 0,
        lcp_fee: 0,
        logistic_shipping_fee: 3e4,
        net_sales: 15002e3,
        nmv: 15002e3,
        ori_shipping_fee: 3e4,
        paid_amount: 15032e3,
        pi_ship: 0,
        pickup_address_id: 21,
        pickup_code: "PK100021",
        platform_ship_rebate: 0,
        platform_ship_rebate_for_seller: 0,
        prepaid_cod: 0,
        quantity: 3,
        refund: 0,
        refund_commission_fee: 0,
        refund_flexi_combo: 0,
        refund_infrastructure_fee: 0,
        refund_service_fee: 0,
        refund_shipping_fee: 0,
        refund_sponsored_affiliates: 0,
        refund_transaction_fee: 0,
        return_to_seller_shipping_fee: 0,
        seller_ship_rebate: 0,
        seller_shipping_fee: 0,
        service_fee: 0,
        shipment_created_time: 0,
        shipped_time: 0,
        shipping_fee: 3e4,
        sla_time: 0,
        sponsored_affiliates: 0,
        status: 300,
        status_display: "\u0110\xE3 duy\u1EC7t",
        shop_id: 11311,
        tax_amount: 0,
        tracking_code: "SPX12345678VN",
        transaction_fee: 3e4,
        voucher_platform: 0,
        voucher_seller: 0,
        wrong_weight_adjustment: 0
      }
    },
    unmapped: {
      completed_time: 0,
      created_time: 1785915163,
      escrow_release_time: 0,
      external_information: {
        cart_id: null,
        channel_buyer_id: "shopee_user_unmapped_01",
        channel_note: "Don hang chua SKU chua duoc anh xa"
      },
      fulfilled_time: 0,
      invoice_information: {
        code: "0312345678",
        company: "Khach Hang Test Unmapped",
        fullname: "Tran Thi B",
        email: "unmapped_buyer@example.com",
        phone: "0911111111",
        address: "456 Tran Hung Dao, Quan 5",
        zip_code: "700000",
        commune: "Phuong 1",
        district: "Quan 5",
        province: "TP. Ho Chi Minh",
        country: "VN"
      },
      is_fulfilled: false,
      omisell_created_time: 1785915163,
      omisell_order_number: "ODVN2608UNMAPPED",
      order_note: "Don hang chua SKU chua duoc anh xa de kiem thu ngoai le",
      order_number: "DH-UNMAPPED-01",
      order_type: "normal",
      parcels: [
        {
          package_number: "1",
          pickup_id: 21,
          pickup_code: "PK100021",
          shipping_fee: 3e4,
          catalogue_items: [
            {
              order_item_id: 987654401,
              catalogue_sku: "SRM-100",
              product_name: "S\u1EEFa r\u1EEDa m\u1EB7t b\xF9n kho\xE1ng 100ml",
              quantity: 2,
              weight: 100,
              original_price: 15e4,
              discounted_price: 15e4,
              is_gift: false,
              is_combo: false,
              discount_seller: 0,
              discount_platform: 0,
              voucher_seller: 0,
              voucher_platform: 0,
              warehouse_code: ""
            },
            {
              order_item_id: 987654402,
              catalogue_sku: "TONER-150",
              product_name: "N\u01B0\u1EDBc hoa h\u1ED3ng c\u1EA5p \u1EA9m 150ml",
              quantity: 2,
              weight: 150,
              original_price: 18e4,
              discounted_price: 18e4,
              is_gift: false,
              is_combo: false,
              discount_seller: 0,
              discount_platform: 0,
              voucher_seller: 0,
              voucher_platform: 0,
              warehouse_code: ""
            }
          ],
          inventory_items: [
            {
              order_item_id: 987654401,
              catalogue_sku: "SRM-100",
              inventory_sku: "SRM-100",
              esku: "ERP-SRM-100",
              product_name: "S\u1EEFa r\u1EEDa m\u1EB7t b\xF9n kho\xE1ng 100ml",
              unit_name: "Chai",
              quantity: 2,
              sale_price: 15e4,
              sale_price_before_tax: 15e4,
              sale_amount: 3e5,
              invoice_lines: [
                {
                  quantity: 2,
                  unit_price_before_tax: 15e4,
                  unit_price_after_tax: 15e4,
                  amount_before_tax: 3e5,
                  vat_amount: 0,
                  total: 3e5
                }
              ],
              serial_numbers: [],
              tax_vat: 0,
              vendor_pickup_id: 21,
              vendor_pickup_code: "PK100021",
              vendor_name: "My Pham Tu Nhien",
              vendor_id: 27001999
            },
            {
              order_item_id: 987654402,
              catalogue_sku: "TONER-150",
              inventory_sku: "TONER-150",
              esku: "ERP-TONER-150",
              product_name: "N\u01B0\u1EDBc hoa h\u1ED3ng c\u1EA5p \u1EA9m 150ml",
              unit_name: "Chai",
              quantity: 2,
              sale_price: 18e4,
              sale_price_before_tax: 18e4,
              sale_amount: 36e4,
              invoice_lines: [
                {
                  quantity: 2,
                  unit_price_before_tax: 18e4,
                  unit_price_after_tax: 18e4,
                  amount_before_tax: 36e4,
                  vat_amount: 0,
                  total: 36e4
                }
              ],
              serial_numbers: [],
              tax_vat: 0,
              vendor_pickup_id: 21,
              vendor_pickup_code: "PK100021",
              vendor_name: "My Pham Tu Nhien",
              vendor_id: 27001999
            }
          ]
        }
      ],
      payment_information: [
        {
          origin_payment_method: "ShopeePay",
          payment_method: "2",
          payment_method_name: "Thanh to\xE1n tr\u1EF1c tuy\u1EBFn",
          transaction_amount: 69e4,
          transaction_status: 200,
          transaction_status_name: "\u0110\xE3 thanh to\xE1n",
          transaction_code: "PVUNMAPPED001",
          transaction_external_code: "EXT-UNMAPPED-01",
          transaction_reference: "REF-UNMAPPED-01",
          transaction_time: 1785915164,
          transaction_note: "Thanh toan don chua anh xa SKU"
        }
      ],
      platform: "shopee",
      platform_name: "Shopee",
      receiver: {
        fullname: "Tran Thi B",
        email: "unmapped_buyer@example.com",
        phone: "0911111111",
        address: "456 Tran Hung Dao, Quan 5",
        country: "VN",
        zip_code: "700000",
        province: "TP. H\u1ED3 Ch\xED Minh",
        province_id: 466617,
        district: "Qu\u1EADn 5",
        district_id: 5,
        subdistrict_name: "Ph\u01B0\u1EDDng 1",
        subdistrict_id: 10
      },
      seller_id: 27001999,
      seller_voucher_code: [],
      shipped_time: 0,
      shipping_information: {
        origin_shipping_fee: 3e4,
        buyer_shipping_fee: 3e4,
        seller_shipping_fee: 0,
        platform_ship_rebate: 0,
        seller_ship_rebate: 0,
        wrong_weight_adjustment: 0
      },
      shop_id: 11311,
      shop_name: "Trung Nguyen E-Store",
      status_id: 300,
      status_name: "\u0110\xE3 duy\u1EC7t",
      updated_time: 1785915222,
      finance: {
        abnormal_buyer_shipping_fee: 0,
        adjustment_amount: 0,
        buyer_shipping_fee: 3e4,
        campaign_fee: 0,
        cod_amount: 0,
        cogs: 35e4,
        coin_discount: 0,
        commission_fee: 2e4,
        completed_time: 0,
        created_time: 1785915163,
        currency: "VND",
        discount_other: 0,
        discount_platform: 0,
        discount_seller: 0,
        discouted_sale_price: 66e4,
        escrow_amount: 635e3,
        escrow_time: 0,
        estimate_escrow_amount: 635e3,
        expenses: 25e3,
        external_tracking_code: "SPX9918237VN",
        flexi_combo: 0,
        fsm_fee: 0,
        fulfill_fee: 0,
        fulfilled_time: 0,
        gross_sales: 66e4,
        infrastructure_fee: 0,
        invoice_issue_time: 0,
        lcp_fee: 0,
        logistic_shipping_fee: 3e4,
        net_sales: 66e4,
        nmv: 66e4,
        ori_shipping_fee: 3e4,
        paid_amount: 69e4,
        pi_ship: 0,
        pickup_address_id: 21,
        pickup_code: "PK100021",
        platform_ship_rebate: 0,
        platform_ship_rebate_for_seller: 0,
        prepaid_cod: 0,
        quantity: 4,
        refund: 0,
        refund_commission_fee: 0,
        refund_flexi_combo: 0,
        refund_infrastructure_fee: 0,
        refund_service_fee: 0,
        refund_shipping_fee: 0,
        refund_sponsored_affiliates: 0,
        refund_transaction_fee: 0,
        return_to_seller_shipping_fee: 0,
        seller_ship_rebate: 0,
        seller_shipping_fee: 0,
        service_fee: 0,
        shipment_created_time: 0,
        shipped_time: 0,
        shipping_fee: 3e4,
        sla_time: 0,
        sponsored_affiliates: 0,
        status: 300,
        status_display: "\u0110\xE3 duy\u1EC7t",
        shop_id: 11311,
        tax_amount: 0,
        tracking_code: "SPX9918237VN",
        transaction_fee: 5e3,
        voucher_platform: 0,
        voucher_seller: 0,
        wrong_weight_adjustment: 0
      }
    },
    cod: {
      completed_time: 0,
      created_time: 1785915163,
      escrow_release_time: 0,
      external_information: {
        cart_id: null,
        channel_buyer_id: "shopee_user_cod_01",
        channel_note: "Giao hang thu tien mat tan noi"
      },
      fulfilled_time: 0,
      invoice_information: {
        code: "0312345678",
        company: "Trung Nguyen Corp",
        fullname: "Le Van C",
        email: "cod_buyer@example.com",
        phone: "0922222222",
        address: "789 Nguyen Trai, Quan 1",
        zip_code: "700000",
        commune: "Ben Thanh",
        district: "Quan 1",
        province: "TP. Ho Chi Minh",
        country: "VN"
      },
      is_fulfilled: false,
      omisell_created_time: 1785915163,
      omisell_order_number: "ODVN2608COD01",
      order_note: "Don hang COD thanh toan khi nhan hang",
      order_number: "DH-COD-01",
      order_type: "normal",
      parcels: [
        {
          package_number: "1",
          pickup_id: 21,
          pickup_code: "PK100021",
          shipping_fee: 3e4,
          catalogue_items: [
            {
              order_item_id: 987654321,
              catalogue_sku: "DELL-V3020",
              product_name: "M\xE1y t\xEDnh Dell Vostro 3020",
              quantity: 1,
              weight: 5e3,
              original_price: 15e6,
              discounted_price: 15e6,
              is_gift: false,
              is_combo: false,
              discount_seller: 0,
              discount_platform: 0,
              voucher_seller: 0,
              voucher_platform: 0,
              warehouse_code: ""
            }
          ],
          inventory_items: [
            {
              order_item_id: 987654321,
              catalogue_sku: "DELL-V3020",
              inventory_sku: "DELL-V3020",
              esku: "DELL-V3020",
              product_name: "M\xE1y t\xEDnh Dell Vostro 3020",
              unit_name: "\u0110\u01A1n v\u1ECB",
              quantity: 1,
              sale_price: 15e6,
              sale_price_before_tax: 15e6,
              sale_amount: 15e6,
              invoice_lines: [
                {
                  quantity: 1,
                  unit_price_before_tax: 15e6,
                  unit_price_after_tax: 15e6,
                  amount_before_tax: 15e6,
                  vat_amount: 0,
                  total: 15e6
                }
              ],
              serial_numbers: [],
              tax_vat: 0,
              vendor_pickup_id: 21,
              vendor_pickup_code: "PK100021",
              vendor_name: "Trung Nguyen Corp",
              vendor_id: 27001999
            }
          ]
        }
      ],
      payment_information: [
        {
          origin_payment_method: "COD",
          payment_method: "1",
          payment_method_name: "Giao h\xE0ng thu ti\u1EC1n (CoD)",
          transaction_amount: 1503e4,
          transaction_status: 100,
          transaction_status_name: "Ch\u01B0a thanh to\xE1n",
          transaction_code: "PVCOD0001",
          transaction_external_code: "EXT-COD-01",
          transaction_reference: "REF-COD-01",
          transaction_time: 1785915164,
          transaction_note: "Thu tien mat khi giao hang COD"
        }
      ],
      platform: "shopee",
      platform_name: "Shopee",
      receiver: {
        fullname: "Le Van C",
        email: "cod_buyer@example.com",
        phone: "0922222222",
        address: "789 Nguyen Trai, Quan 1",
        country: "VN",
        zip_code: "700000",
        province: "TP. H\u1ED3 Ch\xED Minh",
        province_id: 466617,
        district: "Qu\u1EADn 1",
        district_id: 1,
        subdistrict_name: "B\u1EBFn Th\xE0nh",
        subdistrict_id: 2
      },
      seller_id: 27001999,
      seller_voucher_code: [],
      shipped_time: 0,
      shipping_information: {
        origin_shipping_fee: 3e4,
        buyer_shipping_fee: 3e4,
        seller_shipping_fee: 0,
        platform_ship_rebate: 0,
        seller_ship_rebate: 0,
        wrong_weight_adjustment: 0
      },
      shop_id: 11311,
      shop_name: "Trung Nguyen E-Store",
      status_id: 300,
      status_name: "\u0110\xE3 duy\u1EC7t",
      updated_time: 1785915222,
      finance: {
        abnormal_buyer_shipping_fee: 0,
        adjustment_amount: 0,
        buyer_shipping_fee: 3e4,
        campaign_fee: 0,
        cod_amount: 1503e4,
        cogs: 125e5,
        coin_discount: 0,
        commission_fee: 45e4,
        completed_time: 0,
        created_time: 1785915163,
        currency: "VND",
        discount_other: 0,
        discount_platform: 0,
        discount_seller: 0,
        discouted_sale_price: 15e6,
        escrow_amount: 0,
        escrow_time: 0,
        estimate_escrow_amount: 1455e4,
        expenses: 48e4,
        external_tracking_code: "COD12345678VN",
        flexi_combo: 0,
        fsm_fee: 0,
        fulfill_fee: 0,
        fulfilled_time: 0,
        gross_sales: 15e6,
        infrastructure_fee: 0,
        invoice_issue_time: 0,
        lcp_fee: 0,
        logistic_shipping_fee: 3e4,
        net_sales: 15e6,
        nmv: 15e6,
        ori_shipping_fee: 3e4,
        paid_amount: 0,
        pi_ship: 0,
        pickup_address_id: 21,
        pickup_code: "PK100021",
        platform_ship_rebate: 0,
        platform_ship_rebate_for_seller: 0,
        prepaid_cod: 0,
        quantity: 1,
        refund: 0,
        refund_commission_fee: 0,
        refund_flexi_combo: 0,
        refund_infrastructure_fee: 0,
        refund_service_fee: 0,
        refund_shipping_fee: 0,
        refund_sponsored_affiliates: 0,
        refund_transaction_fee: 0,
        return_to_seller_shipping_fee: 0,
        seller_ship_rebate: 0,
        seller_shipping_fee: 0,
        service_fee: 0,
        shipment_created_time: 0,
        shipped_time: 0,
        shipping_fee: 3e4,
        sla_time: 0,
        sponsored_affiliates: 0,
        status: 300,
        status_display: "\u0110\xE3 duy\u1EC7t",
        shop_id: 11311,
        tax_amount: 0,
        tracking_code: "COD12345678VN",
        transaction_fee: 3e4,
        voucher_platform: 0,
        voucher_seller: 0,
        wrong_weight_adjustment: 0
      }
    },
    voucher: {
      completed_time: 0,
      created_time: 1785915163,
      escrow_release_time: 0,
      external_information: {
        cart_id: null,
        channel_buyer_id: "shopee_user_voucher_01",
        channel_note: "Don hang ap dung voucher san 20k va voucher shop 10k"
      },
      fulfilled_time: 0,
      invoice_information: {
        code: "0312345678",
        company: "Trung Nguyen Corp",
        fullname: "Pham Thi D",
        email: "voucher_buyer@example.com",
        phone: "0933333333",
        address: "101 Hai Ba Trung, Quan 1",
        zip_code: "700000",
        commune: "Ben Nghe",
        district: "Quan 1",
        province: "TP. Ho Chi Minh",
        country: "VN"
      },
      is_fulfilled: false,
      omisell_created_time: 1785915163,
      omisell_order_number: "ODVN2608VOUCHER01",
      order_note: "Don hang ap dung voucher san 20k va voucher shop 10k",
      order_number: "DH-VOUCHER-01",
      order_type: "normal",
      parcels: [
        {
          package_number: "1",
          pickup_id: 21,
          pickup_code: "PK100021",
          shipping_fee: 3e4,
          catalogue_items: [
            {
              order_item_id: 987654322,
              catalogue_sku: "3333",
              product_name: "B\u1ED9t cacao nguy\xEAn ch\u1EA5t 200g",
              quantity: 2,
              weight: 200,
              original_price: 54e3,
              discounted_price: 44e3,
              is_gift: false,
              is_combo: false,
              discount_seller: 1e4,
              discount_platform: 2e4,
              voucher_seller: 1e4,
              voucher_platform: 2e4,
              warehouse_code: ""
            }
          ],
          inventory_items: [
            {
              order_item_id: 987654322,
              catalogue_sku: "3333",
              inventory_sku: "3333",
              esku: "3333",
              product_name: "B\u1ED9t cacao nguy\xEAn ch\u1EA5t 200g",
              unit_name: "\u0110\u01A1n v\u1ECB",
              quantity: 2,
              sale_price: 54e3,
              sale_price_before_tax: 54e3,
              sale_amount: 108e3,
              invoice_lines: [
                {
                  quantity: 2,
                  unit_price_before_tax: 54e3,
                  unit_price_after_tax: 54e3,
                  amount_before_tax: 108e3,
                  vat_amount: 0,
                  total: 108e3
                }
              ],
              serial_numbers: [],
              tax_vat: 0,
              vendor_pickup_id: 21,
              vendor_pickup_code: "PK100021",
              vendor_name: "Trung Nguyen Corp",
              vendor_id: 27001999
            }
          ]
        }
      ],
      payment_information: [
        {
          origin_payment_method: "ShopeePay",
          payment_method: "2",
          payment_method_name: "Thanh to\xE1n tr\u1EF1c tuy\u1EBFn (ShopeePay)",
          transaction_amount: 108e3,
          transaction_status: 200,
          transaction_status_name: "\u0110\xE3 thanh to\xE1n",
          transaction_code: "PVVOUCHER001",
          transaction_external_code: "EXT-VOUCHER-01",
          transaction_reference: "REF-VOUCHER-01",
          transaction_time: 1785915164,
          transaction_note: "Da tru voucher 20k platform va 10k shop"
        }
      ],
      platform: "shopee",
      platform_name: "Shopee",
      receiver: {
        fullname: "Pham Thi D",
        email: "voucher_buyer@example.com",
        phone: "0933333333",
        address: "101 Hai Ba Trung, Quan 1",
        country: "VN",
        zip_code: "700000",
        province: "TP. H\u1ED3 Ch\xED Minh",
        province_id: 466617,
        district: "Qu\u1EADn 1",
        district_id: 1,
        subdistrict_name: "B\u1EBFn Ngh\xE9",
        subdistrict_id: 1
      },
      seller_id: 27001999,
      seller_voucher_code: [
        {
          name: "Gi\u1EA3m gi\xE1 shop 10k",
          code: "VOUCHER_SHOP_10K",
          amount: "10000"
        }
      ],
      shipped_time: 0,
      shipping_information: {
        origin_shipping_fee: 3e4,
        buyer_shipping_fee: 1e4,
        seller_shipping_fee: 0,
        platform_ship_rebate: 2e4,
        seller_ship_rebate: 0,
        wrong_weight_adjustment: 0
      },
      shop_id: 11311,
      shop_name: "Trung Nguyen E-Store",
      status_id: 300,
      status_name: "\u0110\xE3 duy\u1EC7t",
      updated_time: 1785915222,
      finance: {
        abnormal_buyer_shipping_fee: 0,
        adjustment_amount: 0,
        buyer_shipping_fee: 1e4,
        campaign_fee: 0,
        cod_amount: 0,
        cogs: 68e3,
        coin_discount: 0,
        commission_fee: 3e3,
        completed_time: 0,
        created_time: 1785915163,
        currency: "VND",
        discount_other: 0,
        discount_platform: 2e4,
        discount_seller: 1e4,
        discouted_sale_price: 78e3,
        escrow_amount: 95e3,
        escrow_time: 0,
        estimate_escrow_amount: 95e3,
        expenses: 13e3,
        external_tracking_code: "SPXVOUCHER001",
        flexi_combo: 0,
        fsm_fee: 0,
        fulfill_fee: 0,
        fulfilled_time: 0,
        gross_sales: 108e3,
        infrastructure_fee: 0,
        invoice_issue_time: 0,
        lcp_fee: 0,
        logistic_shipping_fee: 3e4,
        net_sales: 98e3,
        nmv: 98e3,
        ori_shipping_fee: 3e4,
        paid_amount: 108e3,
        pi_ship: 0,
        pickup_address_id: 21,
        pickup_code: "PK100021",
        platform_ship_rebate: 2e4,
        platform_ship_rebate_for_seller: 0,
        prepaid_cod: 0,
        quantity: 2,
        refund: 0,
        refund_commission_fee: 0,
        refund_flexi_combo: 0,
        refund_infrastructure_fee: 0,
        refund_service_fee: 0,
        refund_shipping_fee: 0,
        refund_sponsored_affiliates: 0,
        refund_transaction_fee: 0,
        return_to_seller_shipping_fee: 0,
        seller_ship_rebate: 0,
        seller_shipping_fee: 0,
        service_fee: 0,
        shipment_created_time: 0,
        shipped_time: 0,
        shipping_fee: 3e4,
        sla_time: 0,
        sponsored_affiliates: 0,
        status: 300,
        status_display: "\u0110\xE3 duy\u1EC7t",
        shop_id: 11311,
        tax_amount: 0,
        tracking_code: "SPXVOUCHER001",
        transaction_fee: 2e3,
        voucher_platform: 2e4,
        voucher_seller: 1e4,
        wrong_weight_adjustment: 0
      }
    },
    cancelled: {
      completed_time: 1785915222,
      created_time: 1785915163,
      escrow_release_time: 0,
      external_information: {
        cart_id: null,
        channel_buyer_id: "shopee_user_cancelled_01",
        channel_note: "Don hang da bi huy truoc khi dong goi"
      },
      fulfilled_time: 0,
      invoice_information: {
        code: "0312345678",
        company: "Trung Nguyen Corp",
        fullname: "Hoang Van E",
        email: "cancelled_buyer@example.com",
        phone: "0944444444",
        address: "222 Cong Hoa, Tan Binh",
        zip_code: "700000",
        commune: "Phuong 13",
        district: "Tan Binh",
        province: "TP. Ho Chi Minh",
        country: "VN"
      },
      is_fulfilled: false,
      omisell_created_time: 1785915163,
      omisell_order_number: "ODVN2608CANCEL01",
      order_note: "Don hang da bi huy truoc khi dong goi",
      order_number: "DH-CANCEL-01",
      order_type: "normal",
      cancel_reason: "Customer requested cancellation",
      parcels: [
        {
          package_number: "1",
          pickup_id: 21,
          pickup_code: "PK100021",
          shipping_fee: 3e4,
          catalogue_items: [
            {
              order_item_id: 987654323,
              catalogue_sku: "11111111",
              product_name: "B\xE1nh quy y\u1EBFn m\u1EA1ch 200g",
              quantity: 1,
              weight: 200,
              original_price: 35e3,
              discounted_price: 35e3,
              is_gift: false,
              is_combo: false,
              discount_seller: 0,
              discount_platform: 0,
              voucher_seller: 0,
              voucher_platform: 0,
              warehouse_code: ""
            }
          ],
          inventory_items: [
            {
              order_item_id: 987654323,
              catalogue_sku: "11111111",
              inventory_sku: "11111111",
              esku: "11111111",
              product_name: "B\xE1nh quy y\u1EBFn m\u1EA1ch 200g",
              unit_name: "\u0110\u01A1n v\u1ECB",
              quantity: 1,
              sale_price: 35e3,
              sale_price_before_tax: 35e3,
              sale_amount: 35e3,
              invoice_lines: [
                {
                  quantity: 1,
                  unit_price_before_tax: 35e3,
                  unit_price_after_tax: 35e3,
                  amount_before_tax: 35e3,
                  vat_amount: 0,
                  total: 35e3
                }
              ],
              serial_numbers: [],
              tax_vat: 0,
              vendor_pickup_id: 21,
              vendor_pickup_code: "PK100021",
              vendor_name: "Trung Nguyen Corp",
              vendor_id: 27001999
            }
          ]
        }
      ],
      payment_information: [
        {
          origin_payment_method: "ShopeePay",
          payment_method: "2",
          payment_method_name: "Thanh to\xE1n tr\u1EF1c tuy\u1EBFn",
          transaction_amount: 65e3,
          transaction_status: 300,
          transaction_status_name: "Ho\xE0n ti\u1EC1n",
          transaction_code: "PVCANCEL001",
          transaction_external_code: "EXT-CANCEL-01",
          transaction_reference: "REF-CANCEL-01",
          transaction_time: 1785915164,
          transaction_note: "Da hoan tien toan phan do huy don hang"
        }
      ],
      platform: "shopee",
      platform_name: "Shopee",
      receiver: {
        fullname: "Hoang Van E",
        email: "cancelled_buyer@example.com",
        phone: "0944444444",
        address: "222 Cong Hoa, Tan Binh",
        country: "VN",
        zip_code: "700000",
        province: "TP. H\u1ED3 Ch\xED Minh",
        province_id: 466617,
        district: "T\xE2n B\xECnh",
        district_id: 6,
        subdistrict_name: "Ph\u01B0\u1EDDng 13",
        subdistrict_id: 13
      },
      seller_id: 27001999,
      seller_voucher_code: [],
      shipped_time: 0,
      shipping_information: {
        origin_shipping_fee: 3e4,
        buyer_shipping_fee: 3e4,
        seller_shipping_fee: 0,
        platform_ship_rebate: 0,
        seller_ship_rebate: 0,
        wrong_weight_adjustment: 0
      },
      shop_id: 11311,
      shop_name: "Trung Nguyen E-Store",
      status_id: 900,
      status_name: "CANCELLED",
      updated_time: 1785915222,
      finance: {
        abnormal_buyer_shipping_fee: 0,
        adjustment_amount: 0,
        buyer_shipping_fee: 0,
        campaign_fee: 0,
        cod_amount: 0,
        cogs: 0,
        coin_discount: 0,
        commission_fee: 0,
        completed_time: 1785915222,
        created_time: 1785915163,
        currency: "VND",
        discount_other: 0,
        discount_platform: 0,
        discount_seller: 0,
        discouted_sale_price: 0,
        escrow_amount: 0,
        escrow_time: 0,
        estimate_escrow_amount: 0,
        expenses: 0,
        external_tracking_code: null,
        flexi_combo: 0,
        fsm_fee: 0,
        fulfill_fee: 0,
        fulfilled_time: 0,
        gross_sales: 0,
        infrastructure_fee: 0,
        invoice_issue_time: 0,
        lcp_fee: 0,
        logistic_shipping_fee: 0,
        net_sales: 0,
        nmv: 0,
        ori_shipping_fee: 0,
        paid_amount: 0,
        pi_ship: 0,
        pickup_address_id: 21,
        pickup_code: "PK100021",
        platform_ship_rebate: 0,
        platform_ship_rebate_for_seller: 0,
        prepaid_cod: 0,
        quantity: 0,
        refund: 65e3,
        refund_commission_fee: 0,
        refund_flexi_combo: 0,
        refund_infrastructure_fee: 0,
        refund_service_fee: 0,
        refund_shipping_fee: 0,
        refund_sponsored_affiliates: 0,
        refund_transaction_fee: 0,
        return_to_seller_shipping_fee: 0,
        seller_ship_rebate: 0,
        seller_shipping_fee: 0,
        service_fee: 0,
        shipment_created_time: 0,
        shipped_time: 0,
        shipping_fee: 0,
        sla_time: 0,
        sponsored_affiliates: 0,
        status: 900,
        status_display: "CANCELLED",
        shop_id: 11311,
        tax_amount: 0,
        tracking_code: null,
        transaction_fee: 0,
        voucher_platform: 0,
        voucher_seller: 0,
        wrong_weight_adjustment: 0
      }
    }
  }
};

// src/routes/orders.ts
var ordersRouter = new Hono3();
var scenarioDataMap = orders_default.scenarios;
var orderList = orders_default.list;
function resolveScenario(orderSn, scenarioParam) {
  if (scenarioParam && scenarioParam in scenarioDataMap) {
    return scenarioParam;
  }
  const upperSn = orderSn.toUpperCase();
  if (upperSn.includes("UNMAPPED")) return "unmapped";
  if (upperSn.includes("COD")) return "cod";
  if (upperSn.includes("VOUCHER")) return "voucher";
  if (upperSn.includes("CANCEL")) return "cancelled";
  return "mapped";
}
ordersRouter.get("/list", (c) => {
  const page = Math.max(1, Number(c.req.query("page") || 1));
  const pageSize = Math.min(50, Math.max(1, Number(c.req.query("page_size") || 25)));
  const scenario = c.req.query("scenario");
  const keyword = (c.req.query("keyword") || "").trim().toLowerCase();
  const status = c.req.query("status") || c.req.query("order_status");
  const shopId = c.req.query("shop_id");
  let filtered = [...orderList];
  if (scenario && scenario in scenarioDataMap) {
    filtered = filtered.filter((o) => o.scenario === scenario);
  }
  if (keyword) {
    filtered = filtered.filter(
      (o) => o.order_number.toLowerCase().includes(keyword) || o.omisell_order_number.toLowerCase().includes(keyword)
    );
  }
  if (status) {
    const statusNumber = Number(status);
    if (!Number.isNaN(statusNumber)) {
      filtered = filtered.filter((o) => o.status_id === statusNumber);
    }
  }
  if (shopId) {
    const shopIdNumber = Number(shopId);
    if (!Number.isNaN(shopIdNumber)) {
      filtered = filtered.filter((o) => o.shop_id === shopIdNumber);
    }
  }
  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);
  const totalCount = filtered.length;
  const baseUrl = c.req.url.split("?")[0];
  const nextPage = start + pageSize < totalCount ? `${baseUrl}?page=${page + 1}&page_size=${pageSize}` : null;
  const prevPage = page > 1 ? `${baseUrl}?page=${page - 1}&page_size=${pageSize}` : null;
  const results = paginated.map((o) => ({
    order_number: o.order_number,
    omisell_order_number: o.omisell_order_number,
    created_time: o.created_time,
    updated_time: o.updated_time,
    escrow_release_time: o.escrow_release_time,
    shop_id: o.shop_id,
    status_id: o.status_id,
    status_name: o.status_name,
    is_fulfilled: o.is_fulfilled
  }));
  return sendSuccess(c, {
    count: totalCount,
    next: nextPage,
    previous: prevPage,
    results
  });
});
ordersRouter.post("/cancel", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const orderSn = body.order_sn || body.omisell_order_number || "UNKNOWN_ORDER";
  const reason = body.cancel_reason || "Cancelled by Odoo system";
  const baseOrder = scenarioDataMap.cancelled;
  const cancelledResponse = {
    ...baseOrder,
    omisell_order_number: orderSn,
    order_number: body.order_number || `ORD-${orderSn}`,
    status_id: 900,
    status_name: "CANCELLED",
    cancel_reason: reason,
    updated_time: Math.floor(Date.now() / 1e3)
  };
  return sendSuccess(c, cancelledResponse, "Order cancelled successfully");
});
ordersRouter.patch("/:omisell_order_number/cancel", async (c) => {
  const orderSn = c.req.param("omisell_order_number");
  const body = await c.req.json().catch(() => ({}));
  const reason = body.cancel_reason || body.note || "Customer changed mind";
  const baseOrder = scenarioDataMap.cancelled;
  const cancelledResponse = {
    ...baseOrder,
    omisell_order_number: orderSn,
    order_number: `ORD-${orderSn}`,
    status_id: 900,
    status_name: "CANCELLED",
    cancel_reason: reason,
    updated_time: Math.floor(Date.now() / 1e3)
  };
  return sendSuccess(c, cancelledResponse, "Order cancelled successfully");
});
ordersRouter.post("/:omisell_order_number/cancel", async (c) => {
  const orderSn = c.req.param("omisell_order_number");
  const body = await c.req.json().catch(() => ({}));
  const reason = body.cancel_reason || body.note || "Customer changed mind";
  const baseOrder = scenarioDataMap.cancelled;
  const cancelledResponse = {
    ...baseOrder,
    omisell_order_number: orderSn,
    order_number: `ORD-${orderSn}`,
    status_id: 900,
    status_name: "CANCELLED",
    cancel_reason: reason,
    updated_time: Math.floor(Date.now() / 1e3)
  };
  return sendSuccess(c, cancelledResponse, "Order cancelled successfully");
});
ordersRouter.post("/add", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const orderNumber = body.order_number || `ORD-${Date.now()}`;
  const omisellOrderNumber = `ODVN${Date.now()}`;
  const createdOrder = {
    order_number: orderNumber,
    omisell_order_number: omisellOrderNumber,
    status_id: 300,
    status_name: "\u0110\xE3 duy\u1EC7t",
    created_time: Math.floor(Date.now() / 1e3),
    items_count: Array.isArray(body.items) ? body.items.length : 1
  };
  return sendSuccess(c, createdOrder, "Order created successfully", 201);
});
ordersRouter.get("/:omisell_order_number/finance", (c) => {
  const orderSn = c.req.param("omisell_order_number");
  const scenarioParam = c.req.query("scenario");
  const selectedScenario = resolveScenario(orderSn, scenarioParam);
  const baseOrder = scenarioDataMap[selectedScenario] || scenarioDataMap.mapped;
  if (!baseOrder.finance) {
    return sendError(c, "Finance information not found for this order", 404);
  }
  return sendSuccess(c, baseOrder.finance);
});
ordersRouter.get("/:omisell_order_number", (c) => {
  const orderSn = c.req.param("omisell_order_number");
  const scenarioParam = c.req.query("scenario");
  const isDynamic = c.req.query("dynamic") === "true" || orderSn.toUpperCase() === "DH-RANDOM";
  const selectedScenario = resolveScenario(orderSn, scenarioParam);
  const baseOrder = scenarioDataMap[selectedScenario] || scenarioDataMap.mapped;
  const currentTimeSeconds = Math.floor(Date.now() / 1e3);
  const resolvedOrderSn = isDynamic ? `ODVN${Date.now()}` : orderSn;
  const resolvedOrderNumber = isDynamic ? `DH-${Date.now()}` : orderSn === "ODVN260805F24CA2C0" ? "DH-0001" : orderSn;
  const detailedOrder = {
    ...baseOrder,
    omisell_order_number: resolvedOrderSn,
    order_number: resolvedOrderNumber,
    created_time: isDynamic ? currentTimeSeconds : baseOrder.created_time,
    updated_time: currentTimeSeconds
  };
  return sendSuccess(c, detailedOrder);
});

// data/shipments.json
var shipments_default = {
  list: [
    {
      order_number: "DH-0001",
      omisell_order_number: "ODVN260805F24CA2C0",
      omisell_shipment_number: "SPVN260728600605E9",
      wms_order_number: "WMS-0001-A",
      courier_tracking_number: "585245841906959599",
      created_time: 1785226453,
      updated_time: 1785303324,
      status_id: 400,
      status_name: "\u0110ang giao h\xE0ng",
      is_fulfilled: true
    },
    {
      order_number: "ORD-TEST-REAL-001",
      omisell_order_number: "ODVN2608REAL001",
      omisell_shipment_number: "SPVN26072765FE9839",
      wms_order_number: "WMS-0002-B",
      courier_tracking_number: "527004256043107",
      created_time: 1785134488,
      updated_time: 1785134498,
      status_id: 200,
      status_name: "Ch\u1EDD \u0111\xF3ng g\xF3i",
      is_fulfilled: false
    },
    {
      order_number: "DH-COD-01",
      omisell_order_number: "ODVN2608COD01",
      omisell_shipment_number: "SPVN2608COD001",
      wms_order_number: "WMS-0003-C",
      courier_tracking_number: "GHTK123456789VN",
      created_time: 1785226453,
      updated_time: 1785303324,
      status_id: 300,
      status_name: "S\u1EB5n s\xE0ng giao",
      is_fulfilled: false
    }
  ],
  sample_detail: {
    order_number: "DH-0001",
    omisell_order_number: "ODVN260805F24CA2C0",
    omisell_shipment_number: "SPVN260728600605E9",
    wms_order_number: "WMS-0001-A",
    courier_tracking_number: "585245841906959599",
    created_time: 1785226453,
    updated_time: 1785303324,
    fulfilled_time: 1785233156,
    sla_time: 178531e4,
    shipped_time: 178524e4,
    delivered_time: 0,
    cod_amount: 0,
    total_amount: 15032e3,
    currency: "VND",
    weight: 5050,
    volume: "40x20x35",
    fail_reason: "",
    shipment_note: "Giao gi\u1EDD h\xE0nh ch\xEDnh, g\u1ECDi tr\u01B0\u1EDBc khi giao",
    fulfillment_by: "T\u1EF1 \u0111\xF3ng g\xF3i",
    cross_check_by: {
      id: 421,
      name: "ZAAQ",
      logo: "https://storage.googleapis.com/omisell-cloud/logo/courier/custom_carrier.svg"
    },
    status_id: 400,
    status_name: "\u0110ang giao h\xE0ng",
    is_fulfilled: true,
    courier: {
      name: "T\u1EF1 v\u1EADn chuy\u1EC3n",
      service_code: "OMI_SD",
      service_name: "D\u1ECBch v\u1EE5 ti\xEAu chu\u1EA9n"
    },
    pickup: {
      id: 21,
      pickup_code: "PK100021",
      pickup_name: "Kho Tong Ho Chi Minh",
      address: "123 Le Loi, Quan 1"
    },
    receiver: {
      fullname: "Nguyen Van A",
      phone: "0900000000",
      email: "buyer@example.com",
      address: "123 Le Loi, Quan 1",
      subdistrict_name: "B\u1EBFn Ngh\xE9",
      subdistrict_id: 1,
      district_name: "Qu\u1EADn 1",
      district_id: 1,
      province_name: "TP. H\u1ED3 Ch\xED Minh",
      province_id: 466617,
      country: "VN"
    },
    items: [
      {
        catalogue_sku: "DELL-V3020",
        inventory_sku: "DELL-V3020",
        esku: "DELL-V3020",
        product_name: "M\xE1y t\xEDnh Dell Vostro 3020",
        unit_name: "\u0110\u01A1n v\u1ECB",
        quantity: 1,
        sale_price: 15e6,
        vendor_pickup_id: "21",
        vendor_pickup_code: "PK100021",
        vendor_name: "Trung Nguyen Corp",
        vendor_id: 27001999
      },
      {
        catalogue_sku: "MATCHA01",
        inventory_sku: "MATCHA01",
        esku: "MATCHA01",
        product_name: "B\u1ED9t matcha Nh\u1EADt B\u1EA3n 50g",
        unit_name: "\u0110\u01A1n v\u1ECB",
        quantity: 2,
        sale_price: 1e3,
        vendor_pickup_id: "21",
        vendor_pickup_code: "PK100021",
        vendor_name: "Trung Nguyen Corp",
        vendor_id: 27001999
      }
    ],
    shipping_label_url: "https://storage.googleapis.com/omisell-cloud/labels/SPVN260728600605E9.pdf"
  }
};

// src/routes/shipments.ts
var shipmentsRouter = new Hono3();
shipmentsRouter.get("/list", (c) => {
  const page = Math.max(1, Number(c.req.query("page") || 1));
  const pageSize = Math.min(50, Math.max(1, Number(c.req.query("page_size") || 25)));
  const totalCount = shipments_default.list.length;
  const baseUrl = c.req.url.split("?")[0];
  const nextPage = pageSize < totalCount ? `${baseUrl}?page=2&page_size=${pageSize}` : null;
  return sendSuccess(c, {
    count: totalCount,
    next: nextPage,
    previous: null,
    results: shipments_default.list
  });
});
shipmentsRouter.post("/book", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const courier = body.courier_name || "SPX Express";
  const trackingNumber = `TRK${Date.now()}VN`;
  const bookedShipment = {
    ...shipments_default.sample_detail,
    courier: {
      name: courier,
      service_code: "STD_SERVICE",
      service_name: "D\u1ECBch v\u1EE5 ti\xEAu chu\u1EA9n"
    },
    courier_tracking_number: trackingNumber,
    shipping_label_url: `https://mock-omisell.example.com/labels/${trackingNumber}.pdf`,
    created_time: Math.floor(Date.now() / 1e3),
    status_id: 300,
    status_name: "Ready to ship"
  };
  return sendSuccess(c, bookedShipment, "Shipment booked successfully", 201);
});
shipmentsRouter.post("/add", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const orderNumber = body.omisell_order_number || `ODVN${Date.now()}`;
  const shipmentNumber = `SPVN${Date.now()}`;
  const trackingNumber = `TRK${Date.now()}VN`;
  const newShipment = {
    ...shipments_default.sample_detail,
    omisell_order_number: orderNumber,
    omisell_shipment_number: shipmentNumber,
    courier_tracking_number: trackingNumber,
    created_time: Math.floor(Date.now() / 1e3)
  };
  return sendSuccess(c, newShipment, "Shipment added successfully", 201);
});
shipmentsRouter.get("/:shipment_id", (c) => {
  const shipmentId = c.req.param("shipment_id");
  const detail = {
    ...shipments_default.sample_detail,
    omisell_shipment_number: shipmentId,
    courier_tracking_number: `TRK${shipmentId}VN`
  };
  return sendSuccess(c, detail);
});

// src/routes/webhook_trigger.ts
var webhookTriggerRouter = new Hono3();
var eventStatusMap = {
  "order.created": { id: 100, name: "Ch\u1EDD duy\u1EC7t", fulfilled: false },
  "order.processing": { id: 300, name: "\u0110\xE3 duy\u1EC7t", fulfilled: false },
  "order.ready_to_ship": { id: 350, name: "S\u1EB5n s\xE0ng giao", fulfilled: false },
  "order.shipped": { id: 400, name: "\u0110ang giao h\xE0ng", fulfilled: false },
  "order.completed": { id: 800, name: "Giao h\xE0ng th\xE0nh c\xF4ng", fulfilled: true },
  "order.delivered": { id: 800, name: "Giao h\xE0ng th\xE0nh c\xF4ng", fulfilled: true },
  "order.cancelled": { id: 900, name: "\u0110\xE3 h\u1EE7y", fulfilled: false },
  "order.returned": { id: 700, name: "\u0110\u01A1n tr\u1EA3 l\u1EA1i", fulfilled: false },
  "order.return_receive": { id: 750, name: "\u0110\xE3 nh\u1EADn h\xE0ng tr\u1EA3", fulfilled: false },
  "order.exceptions": { id: 600, name: "Ngo\u1EA1i l\u1EC7 giao v\u1EADn", fulfilled: false }
};
webhookTriggerRouter.post("/trigger-webhook", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const targetUrl = body.target_webhook_url;
  if (!targetUrl) {
    return sendError(c, "target_webhook_url is required", 400, "target_webhook_url");
  }
  const eventType = body.event_type || "order.created";
  const eventConfig = eventStatusMap[eventType] || { id: 300, name: eventType, fulfilled: false };
  const currentTime = Math.floor(Date.now() / 1e3);
  const orderNumber = body.order_number || `DH-MOCK-${Date.now()}`;
  const omisellOrderNumber = `ODVN${Date.now()}`;
  const requestId = generateRequestId();
  const webhookPayload = {
    data: {
      order_number: orderNumber,
      omisell_order_number: omisellOrderNumber,
      status_id: eventConfig.id,
      status_name: eventConfig.name,
      is_fulfilled: eventConfig.fulfilled,
      created_time: currentTime,
      updated_time: currentTime,
      escrow_release_time: 0,
      shop_id: 11303
    },
    event: eventType,
    shop_id: 11303,
    seller_id: 27001999,
    platform: "Shopee",
    timestamp: currentTime,
    request_id: requestId
  };
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1e4);
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "mock_webhook_client_secret_xyz"
      },
      body: JSON.stringify(webhookPayload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    let responseData = null;
    const responseText = await response.text();
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
    return sendSuccess(
      c,
      {
        target: targetUrl,
        event_type: eventType,
        odoo_status: response.status,
        odoo_response: responseData,
        dispatched_payload: webhookPayload
      },
      "Webhook dispatched successfully"
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return sendError(
      c,
      `Failed to push webhook to ${targetUrl}: ${errorMessage}`,
      502
    );
  }
});

// data/shops.json
var shops_default = {
  shops: [
    {
      business_id: 386,
      country: "VN",
      group_id: 2,
      id: 11311,
      name: "Trung Nguyen E-Store",
      platform: "shopee",
      platform_logo: "https://storage.googleapis.com/omisell-cloud/logo/platforms/shopee.png",
      platform_label: "Shopee",
      user_id: 1,
      external_id: "70280",
      external_channel_id: "7495909798223317571",
      use_fulfillment_provider: "merchant",
      status: "active"
    },
    {
      business_id: 386,
      country: "VN",
      group_id: 2,
      id: 11303,
      name: "Trung Nguyen Official TikTok Shop",
      platform: "tiktok",
      platform_logo: "https://storage.googleapis.com/omisell-cloud/logo/platforms/tiktok.png",
      platform_label: "Tiktok Shop",
      user_id: 1,
      external_id: "70281",
      external_channel_id: "7495909798223317572",
      use_fulfillment_provider: "merchant",
      status: "active"
    }
  ],
  pickups: [
    {
      id: 21,
      user_id: 1,
      country: "VN",
      business_id: 386,
      pickup_code: "PK100021",
      pickup_name: "Kho Tong Ho Chi Minh",
      address: "123 Le Loi, Quan 1",
      province: "TP. Ho Chi Minh",
      province_id: 466617,
      district: "Quan 1",
      district_id: 1,
      subdistrict_name: "Ben Nghe",
      subdistrict_id: 1,
      phone: "0900000000",
      is_default: true
    }
  ],
  wms_pickups: [
    {
      id: 1,
      pickup_id: 21,
      pickup_code: "PK100021",
      wms_warehouse_code: "WH-HCM-MAIN",
      wms_warehouse_name: "WMS HCM Kho Tong"
    }
  ],
  countries: [
    {
      id: 1,
      code: "VN",
      name: "Vietnam",
      phone_code: "+84",
      currency: "VND"
    },
    {
      id: 2,
      code: "TH",
      name: "Thailand",
      phone_code: "+66",
      currency: "THB"
    }
  ],
  provinces: [
    {
      id: 466617,
      country_id: 1,
      code: "79",
      name: "TP. H\u1ED3 Ch\xED Minh"
    },
    {
      id: 466618,
      country_id: 1,
      code: "01",
      name: "H\xE0 N\u1ED9i"
    }
  ],
  districts: [
    {
      id: 1,
      province_id: 466617,
      code: "760",
      name: "Qu\u1EADn 1"
    },
    {
      id: 5,
      province_id: 466617,
      code: "764",
      name: "Qu\u1EADn 5"
    },
    {
      id: 6,
      province_id: 466617,
      code: "766",
      name: "T\xE2n B\xECnh"
    }
  ],
  subdistricts: [
    {
      id: 1,
      district_id: 1,
      code: "26734",
      name: "B\u1EBFn Ngh\xE9"
    },
    {
      id: 2,
      district_id: 1,
      code: "26737",
      name: "B\u1EBFn Th\xE0nh"
    },
    {
      id: 10,
      district_id: 5,
      code: "26881",
      name: "Ph\u01B0\u1EDDng 1"
    },
    {
      id: 13,
      district_id: 6,
      code: "26900",
      name: "Ph\u01B0\u1EDDng 13"
    }
  ],
  partners: [
    {
      seller_id: 27001999,
      email: "csi@abc.com",
      phone: "0900000000",
      last_login: "2026-07-03T08:29:20.853276Z",
      date_joined: "2024-03-15T04:45:09.032874Z",
      avatar: "https://storage.googleapis.com/omisell-cloud/avatar/seller_default.png"
    }
  ]
};

// src/routes/shop.ts
var shopRouter = new Hono3();
shopRouter.get("/shop/list", (c) => {
  return sendSuccess(c, {
    count: shops_default.shops.length,
    next: null,
    previous: null,
    results: shops_default.shops
  });
});
shopRouter.get("/pickup/list", (c) => {
  return sendSuccess(c, {
    count: shops_default.pickups.length,
    next: null,
    previous: null,
    results: shops_default.pickups
  });
});
shopRouter.get("/pickup/wms-map", (c) => {
  return sendSuccess(c, shops_default.wms_pickups);
});
shopRouter.get("/pickup/wms-map/list", (c) => {
  return sendSuccess(c, shops_default.wms_pickups);
});
shopRouter.get("/location/country", (c) => {
  return sendSuccess(c, {
    count: shops_default.countries.length,
    next: null,
    previous: null,
    results: shops_default.countries
  });
});
shopRouter.get("/country/list", (c) => {
  return sendSuccess(c, {
    count: shops_default.countries.length,
    next: null,
    previous: null,
    results: shops_default.countries
  });
});
shopRouter.get("/location/province", (c) => {
  return sendSuccess(c, {
    count: shops_default.provinces.length,
    next: null,
    previous: null,
    results: shops_default.provinces
  });
});
shopRouter.get("/province/list", (c) => {
  return sendSuccess(c, {
    count: shops_default.provinces.length,
    next: null,
    previous: null,
    results: shops_default.provinces
  });
});
shopRouter.get("/location/district", (c) => {
  const provinceId = c.req.query("province_id");
  let filtered = shops_default.districts;
  if (provinceId) {
    filtered = filtered.filter((d) => d.province_id === Number(provinceId));
  }
  return sendSuccess(c, {
    count: filtered.length,
    next: null,
    previous: null,
    results: filtered
  });
});
shopRouter.get("/district/list", (c) => {
  const provinceId = c.req.query("province_id");
  let filtered = shops_default.districts;
  if (provinceId) {
    filtered = filtered.filter((d) => d.province_id === Number(provinceId));
  }
  return sendSuccess(c, {
    count: filtered.length,
    next: null,
    previous: null,
    results: filtered
  });
});
shopRouter.get("/location/subdistrict", (c) => {
  const districtId = c.req.query("district_id");
  let filtered = shops_default.subdistricts;
  if (districtId) {
    filtered = filtered.filter((s) => s.district_id === Number(districtId));
  }
  return sendSuccess(c, {
    count: filtered.length,
    next: null,
    previous: null,
    results: filtered
  });
});
shopRouter.get("/subdistrict/list", (c) => {
  const districtId = c.req.query("district_id");
  let filtered = shops_default.subdistricts;
  if (districtId) {
    filtered = filtered.filter((s) => s.district_id === Number(districtId));
  }
  return sendSuccess(c, {
    count: filtered.length,
    next: null,
    previous: null,
    results: filtered
  });
});
shopRouter.get("/seller-by-partner/list", (c) => {
  return sendSuccess(c, {
    count: shops_default.partners.length,
    next: null,
    previous: null,
    results: shops_default.partners
  });
});

// src/app.ts
var app = new Hono3();
app.use("*", cors());
app.get("/", (c) => {
  return sendSuccess(c, {
    name: "Omisell API v2 Mock Server",
    version: "1.0.0",
    specification: "Omisell API v2 OpenAPI Standard (https://developers.omisell.com/llms.txt)",
    integration: "ORIS Hub & Odoo 18 B3 Integration Suite",
    endpoints: {
      auth: [
        "POST /api/v2/public/oauth/access_token",
        "POST /api/v2/public/oauth/refresh_token",
        "POST /api/v2/auth/token/get/",
        "POST /api/v2/auth/token/refresh/"
      ],
      products: [
        "GET /api/v2/public/product/list",
        "GET /api/v2/public/product/:product_id",
        "GET /api/v2/public/product/sku/:sku",
        "GET /api/v2/public/product/category",
        "POST /api/v2/public/product/add",
        "POST /api/v2/public/inventory/adjust-stock"
      ],
      orders: [
        "GET /api/v2/public/order/list",
        "GET /api/v2/public/order/:omisell_order_number",
        "GET /api/v2/public/order/:omisell_order_number/finance",
        "POST /api/v2/public/order/cancel",
        "PATCH /api/v2/public/order/:omisell_order_number/cancel",
        "POST /api/v2/public/order/add"
      ],
      shipments: [
        "GET /api/v2/public/shipment/list",
        "GET /api/v2/public/shipment/:shipment_id",
        "POST /api/v2/public/shipment/book",
        "POST /api/v2/public/shipment/add"
      ],
      locations_and_shops: [
        "GET /api/v2/public/shop/list",
        "GET /api/v2/public/pickup/list",
        "GET /api/v2/public/pickup/wms-map",
        "GET /api/v2/public/location/country",
        "GET /api/v2/public/location/province",
        "GET /api/v2/public/location/district",
        "GET /api/v2/public/location/subdistrict",
        "GET /api/v2/public/seller-by-partner/list"
      ],
      webhook_tool: [
        "POST /api/mock/trigger-webhook"
      ]
    }
  });
});
app.get("/health", (c) => {
  return sendSuccess(c, {
    status: "ok",
    timestamp: Math.floor(Date.now() / 1e3)
  });
});
app.route("/api/v2/auth", authRouter);
app.route("/api/v2/public", authRouter);
app.route("/api/v2/public/product", productsRouter);
app.route("/api/v2/public/order", ordersRouter);
app.route("/api/v2/public/shipment", shipmentsRouter);
app.route("/api/v2/public", productsRouter);
app.route("/api/v2/public", shopRouter);
app.route("/api/mock", webhookTriggerRouter);
app.route("/mock", webhookTriggerRouter);
app.notFound((c) => {
  return sendError(c, `Endpoint ${c.req.path} not found`, 404);
});
app.onError((err, c) => {
  console.error("Unhandled server error:", err);
  return sendError(c, err.message || "Internal server error", 500);
});

// src/api.ts
var config = {
  runtime: "nodejs"
};
var api_default = getRequestListener(app.fetch);
export {
  config,
  api_default as default
};

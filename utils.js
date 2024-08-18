
function deepCopy(object) {
    var output = Array.isArray(object) ? [] : {};
    for (var data in object) {
        var value = object[data]
        output[data] = (typeof value === "object" && value !== null) ? deepCopy(value) : value;
    }
    return output;
}

export function deepMerge(obj1, obj2) {
    const merged = { ...obj1 };

    for (let key in obj2) {
        if (obj2.hasOwnProperty(key)) {
            if (typeof obj2[key] === "object" && obj1.hasOwnProperty(key) && typeof obj1[key] === "object") {
                merged[key] = mergeArrays(obj1[key], obj2[key]);
            } else {
                merged[key] = obj2[key];
            }
        }
    }

    return merged;
}

function mergeArrays(arr1, arr2) {
    const mergedArray = [...arr1];

    for (let i = 0; i < arr2.length; i++) {
        if (typeof arr2[i] === "object") {
            mergedArray[i] = deepMerge(mergedArray[i], arr2[i]);
        } else {
            mergedArray[i] = arr2[i];
        }
    }

    return mergedArray;
}

export function deepClone(object, merge = {}) {
    const copy = deepCopy(object);
    return deepMerge(copy, merge);
}



const responseCache = {};

export function request(options) {

    const apiURL = options.apiURL ?? ""; // "https://dev.api.atlas.ar"

    const url = options.url ?? (apiURL + options.path);

    if (options.cache) {
        if (url in responseCache) {
            return Promise.resolve(responseCache[url]);
        } else {
            responseCache[url] = {};
        }
    }


    const requestOptions = {
        method: options.method ?? "GET",
        insecure: true,
        credentials: "include",
        headers: {
            Authorization: options.token ? "Basic " + btoa("token:" + options.token) : undefined,
            ...options.body?.constructor?.name != 'FormData' && {'Content-Type': 'application/json'}
        },
        body: options.body ? (options.body?.constructor?.name != 'FormData' ? JSON.stringify(options.body) : options.body) : undefined
    };


    return new Promise((resolve, reject) => {

        fetch(url, requestOptions).then(async resp => {

            const response = responseToObj(resp);

            response.textBody = await resp.text();

            try {
                response.jsonBody = JSON.parse(response.textBody);
            } catch (error) {
            }

            if (options.cache && resp.ok) {
                responseCache[url] = response;
            }

            resolve(response);

        });

    });

}

window.req = request;


export function urlToObj(url) {

    let obj = { searchParams: Object.fromEntries(url.searchParams) };

    ["hash",
        "host",
        "hostname",
        "href",
        "origin",
        "password",
        "pathname",
        "port",
        "protocol",
        "search",
        "username"].forEach(i => obj[i] = url[i]);

    return obj;

}

export function responseToObj(response) {

    let obj = { headers: Object.fromEntries(response.headers) };

    ["bodyUsed",
        "ok",
        "redirected",
        "status",
        "statusText",
        "type",
        "url"].forEach(i => obj[i] = response[i]);

    return obj;

}


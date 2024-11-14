
let document = null;

let Parser = null;

if (typeof DOMParser !== "undefined") {
    Parser = DOMParser;
} else {
    Parser = (await import("jsr:@b-fuze/deno-dom")).DOMParser;
}

document = new Parser().parseFromString("<!DOCTYPE html><html><body></body></html>", "text/html");

export function createElement(type, props, ...children) {

    if (typeof type == "function") {
        return type(props, ...children);
    }
    const element = document.createElement(type);
    // Asignamos los atributos (props) al elemento
    for (const [key, value] of Object.entries(props ?? {})) {
        element.setAttribute(key, value);
    }

    if (props?.dangerouslySetInnerHTML) {
        element.innerHTML = props.dangerouslySetInnerHTML.html;
    } else {
        element.append(...getChildren(children));
    }
    return element;
}
function getChildren(children) {
    if (typeof children === "undefined" || children === null) return [];
    return children.flat(100).map((child) => createNode(child)).filter((child) => child !== null);
}
function createNode(child) {
    if (typeof child === "undefined" || child === null) return null;
    if (child.outerHTML) return child;
    if (typeof child === "object") return document.createTextNode(JSON.stringify(child, null, 4));
    return document.createTextNode(child.toString());
} // export const Fragment = (props) => {
//     return props.children.join("");
// };
// function escapeHtml(unsafe) {
//     return (unsafe ?? "").toString().replace(/&/g, "&amp;").replace(
//         /</g,
//         "&lt;",
//     ).replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
// }

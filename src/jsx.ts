//@ts-nocheck

let document = null;

let Parser = null;

if (typeof DOMParser !== "undefined") {

    Parser = DOMParser;
    
} else {
    
    const denoDom = "jsr:@b-fuze/deno-dom";
    Parser = (await import(denoDom)).DOMParser;

}

document = new Parser().parseFromString("<!DOCTYPE html><html><body></body></html>", "text/html");

const createElement = (type, props, ...children) => {

    if (typeof type == "function") {
        
        return type(props, ...children);

    }

    if (!type) {
        const fragment = document.createDocumentFragment();
        fragment.append(...getChildren(children));
        return fragment;
    }

    const element = document.createElement(type);

    for (let [key, value] of Object.entries(props ?? {})) {

        if(key === "dangerouslySetInnerHTML" || [undefined, null, false].includes(value)) continue;

        if(key == "style" && typeof value === "object") {

            value = cssObjectToString(value);

        }

        if(Array.isArray(value)) value = value.join("");

        element.setAttribute(key, value === true ? "" : value);

    }

    if (props?.dangerouslySetInnerHTML) {
        
        element.innerHTML = props.dangerouslySetInnerHTML.html;

    } else {
        
        element.append(...getChildren(children));

    }

    return element;
}

function cssObjectToString(style) {

    return Object.entries(style).map(([key, value]) => `${key}: ${value}`).join(";");

}

function getChildren(children) {
    
    if (typeof children === "undefined" || children === null) return [];
    
    return children.flat(100).map((child) => createNode(child)).filter((child) => child !== null);

}

function createNode(child) {
    
    if (typeof child === "undefined" || child === null) return null;
    
    if (child.outerHTML || child.nodeType === 11) return child;
    
    if (typeof child === "object") return document.createTextNode(JSON.stringify(child, null, 4));
    
    return document.createTextNode(child.toString());

}

export const React = {
    createElement
}
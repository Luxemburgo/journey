export function DOMDiff(node1, node2, profiling) {

    const changes = {
        deletedAttributes: [],
        changedAttributes: [],
        deletedChildren: [],
        addedChildren: [],
        changedTexts: []
    };

    nodesWalk = 0;
    sortingTime = 0;
    calcs = [];

    if(!node1.isEqualNode(node2)) compareNodes(node1, node2, changes);

    profiling.push({
        duration: Math.round(performance.now() - profiling.slice(-1)[0].time),
        total: Math.round(performance.now() - profiling[0].time),
        calcs: calcs,
        nodesWalk,
        // clean: Math.round(cleanTime ?? 0),
        sort: Math.round(sortingTime),
        stage: "diffCalc",
        time: performance.now(),
    });


    return changes;

}

let nodesWalk = 0;
let sortingTime = 0;
let calcs = [];

export function compareNodes(node1, node2, changes) {
    
    let calcTime = performance.now();
    let childrenCalcTime = 0;

    if(node1.nodeType !== 1) {

        if(node1.textContent != node2.textContent) {
            changes.changedTexts.push({parentNode: node1.parentNode, node: node1, before: node1.textContent, after: node2.textContent});
            node1.textContent = node2.textContent;
        }
        
    }else{

        for (const attr of (node1.attributes ?? [])) {
            if (node2.hasAttribute && !(node2.hasAttribute(attr.name))) {
                changes.deletedAttributes.push({node: node1, name: attr.name, value: attr.value});
                node1.removeAttribute(attr.name);
            }
        }

        for (const attr of (node2.attributes ?? [])) {
            
            if (node1.getAttribute(attr.name) !== attr.value) {
                
                changes.changedAttributes.push({node: node1, name: attr.name, value: attr.value, oldValue: node1.getAttribute(attr.name)});
                node1.setAttribute(attr.name, attr.value);

            }           

        }


        const node1Children = Array.from(node1.childNodes ?? []);
        const node2Children = Array.from(node2.childNodes ?? []);

        for (const child of node1Children) {

            let match = false;

            for (const newChild of node2Children.filter(i => !i.matched)) {
                nodesWalk ++;
                if(child.isEqualNode(newChild)) {
                    
                    newChild.matched = true;
                    
                    match = true;
                    
                    child.sortIndex = node2Children.indexOf(newChild);
                    
                    break;
                }
            }

            if (!match) 
            for (const newChild of node2Children.filter(i => !i.matched)) {
                nodesWalk ++;
                if (compareNodesByCriteria(child, newChild)) {
                    
                    newChild.matched = true;
                    
                    match = true;
                    
                    child.sortIndex = node2Children.indexOf(newChild);
                    
                    if(!child.hasAttribute?.("blackbox") || !newChild.hasAttribute?.("blackbox")) 
                        childrenCalcTime = compareNodes(child, newChild, changes);

                    break;
                }
            }

            if (!match) {
                changes.deletedChildren.push({node: node1, child});
                child.remove();
            }
        }

        const addedChildren = [];

        for (const newChild of node2Children.filter(i => !i.matched)) {
            
            newChild.sortIndex = node2Children.indexOf(newChild);
            
            addedChildren.push(newChild);
        }
        
        if(addedChildren.length) {
            changes.addedChildren.push({node: node1, children: addedChildren});
            node1.append(...addedChildren);
        }


        const sortStart = performance.now();
        sortChilds(node1, changes);
        sortingTime += performance.now() - sortStart;
        
    }

    calcTime = Math.round(performance.now() - calcTime - childrenCalcTime);

    calcs.push({node: node1, time: calcTime});

    return calcTime;

}

function compareNodesByCriteria(node1, node2) {

    const criteria = ['tagName', 'nodeName', 'id'];

    for (const criterion of criteria) {
        if (node1[criterion] !== node2[criterion]) {
            return false;
        }
    }

    return true;
}

function sortChilds(element, changes) {

    let nodesArray = Array.from(element.childNodes).sort((a, b) => a.sortIndex - b.sortIndex);

    for (let i = 0; i < nodesArray.length; i++) {
        if (element.childNodes[i] !== nodesArray[i]) {
            element.insertBefore(nodesArray[i], element.childNodes[i]);
        }
    }

}


function cleanTextNodes(node) {

    // Crear un NodeIterator que recorra todos los nodos de texto
    const nodeIterator = document.createNodeIterator(
        node,                // Nodo raíz donde comenzará la iteración
        NodeFilter.SHOW_TEXT,         // Filtro para mostrar solo nodos de texto
        {
            acceptNode: function(n) {
                return n.textContent.replace(/\n/g,"").trim() == "" ? 
                    NodeFilter.FILTER_ACCEPT
                :
                    NodeFilter.FILTER_REJECT
                ;
            }
        }
    );

    let textNode;
    const textNodes = [];

    // Iterar sobre todos los nodos de texto encontrados
    while ((textNode = nodeIterator.nextNode())) {
        textNode.remove();
    }

}
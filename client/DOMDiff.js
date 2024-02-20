export function compareNodes(node1, node2, changesCallback) {
    
    const changes = {
        deletedAttributes: [],
        addedAttributes: [],
        changedAttributes: [],
        deletedChildren: [],
        addedChildren: [],
        textChanged: []
    };

    if(node1.nodeType === 3) {

        if(node1.textContent != node2.textContent) {
            changes.textChanged.push({before: node1.textContent, after: node2.textContent});
            node1.textContent = node2.textContent;
        }
        
    }else{

        for (const attr of (node1.attributes ?? [])) {
            if (node2.hasAttribute && !(node2.hasAttribute(attr.name))) {
                changes.deletedAttributes.push({name: attr.name, value: attr.value});
            }
        }

        for (const attr of (node2.attributes ?? [])) {
            if (node1.hasAttribute && !(node1.hasAttribute(attr.name))) {
                changes.addedAttributes.push({name: attr.name, value: attr.value});
            } else if (node1.getAttribute(attr.name) !== attr.value) {
                changes.changedAttributes.push({name: attr.name, value: attr.value});
            }
        }

        const node2Children = Array.from(node2.childNodes ?? []);

        for (const child of (node1.childNodes ?? [])) {

            let match = false;

            for (const newChild of node2Children) {
                if (!newChild.matched && compareNodesByCriteria(child, newChild)) {
                    newChild.matched = true;
                    match = true;
                    child.sortIndex = node2Children.indexOf(newChild);
                    compareNodes(child, newChild, changesCallback);
                    break;
                }
            }

            if (!match) {
                changes.deletedChildren.push(child);
            }
        }

        for (const newChild of node2Children.filter(i => !i.matched)) {
            
            newChild.sortIndex = node2Children.indexOf(newChild);
            
            changes.addedChildren.push(newChild);

        }

        changes.deletedChildren.forEach(e => e.remove());
        node1.append(...changes.addedChildren);
        changes.deletedAttributes.forEach(a => node1.removeAttribute(a.name));
        changes.addedAttributes.forEach(a => node1.setAttribute(a.name, a.value));
        changes.changedAttributes.forEach(a => {node1.setAttribute(a.name, a.value); if(a.name=="value")node1.value=a.value;});

        sortChilds(node1);
        
    }

    const result = Object.entries(changes)
    .map(i => ({type: i[0], changes: i[1]}))
    .filter(i => i.changes.length);
    
    if(result.length && changesCallback) changesCallback(node1, result);


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

function sortChilds(element) {
    let swapped = true;
    
    // Paso 3: Realizar el bucle principal
    while (swapped) {
      swapped = false;
    
      // Paso 5: Iterar sobre los childNodes
      for (let i = 1; i < element.childNodes.length; i++) {
        const currentNode = element.childNodes[i];
        const previousNode = element.childNodes[i - 1];
    
        // Paso 6: Comparar los índices y realizar el intercambio si es necesario
        if (currentNode.sortIndex < previousNode.sortIndex) {
          element.insertBefore(currentNode, previousNode);
          swapped = true;
        }
      }
    }
}

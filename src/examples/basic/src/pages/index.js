export default (model, message) => {
    
    if(message?.name === "nameInput") {
        model.name = message.data.target.value;
    }

    if(message?.name === "decrement") {
        model.count = (model.count || 0) - 1;
    }

    if(message?.name === "increment") {
        model.count = (model.count || 0) + 1;
    }

    if(message?.name === "reset") {
        model.count = 0;
    }

    return {model, html: `
    
        <h1>Hello ${model.name || "stranger"}!</h1>
        <label>Your name: <input type="text" messages="input=nameInput" value="${model.name || ""}" /></label>
        
        <div style="display: flex; gap: 10px; align-items: center;">
            <button messages="click=decrement">-</button>
            <p>Count: ${model.count || 0}</p>
            <button messages="click=increment">+</button>
            <button messages="click=reset">Reset</button>
        </div>
    `};

};

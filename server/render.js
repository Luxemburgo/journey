export default async function render(config) {

    // console.log(config.message);

    let state = config.controller ? 
        
        await config.controller(config.model, config.message)

    :
        ({model: config?.model})
    ;

    // console.log(state.commands?.[0]?.toString());

    config.model = state.model;

    if(config.renderCallback) {
        
        state.html = config.renderCallback(state.model, state.html ?? "");

    }
   
    // console.log(typeof state.commands[0]);
    // console.log(config, state);

    for(const command of (state.commands ?? [])) {
        
        state = await command( message => render({...config, message}) );

    };

    
    return state;

}

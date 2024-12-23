import { runServer } from "jsr:@luxemburgo/journey";


runServer({
    serverConfig: {
        port: 5769
    },
    model: {
        name: "",
        count: 1
    }
});

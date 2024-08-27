import { render } from "./client/render.js";

const view = model => /*html*/`
    <head blackbox>
        <script src="https://cdn.tailwindcss.com"></script>
        <!-- <link rel="stylesheet" href="twind.css"> -->
        <script type="module" src="./test.js"></script>
    </head>
    <body class="p-3">
        <header class="flex gap-2 items-center">
            <h1 class="my-5 text-3xl font-bold">Hi ${model?.name ?? "nobody"}!</h1>
            
            <span class="inline-flex -space-x-px overflow-hidden rounded-md border bg-white shadow-sm">
                <button messages="click=sub"class="inline-block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:relative">
                    -
                </button>

                <button messages="click=reset" class="inline-block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:relative"
                >${model?.count ?? 0}</button>

                <button messages="click=add" class="inline-block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:relative">
                    +
                </button>

                <button messages="click=add100" class="inline-block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:relative">
                    ++
                </button>
            </span>
            
            <button messages="click=reverseToggle" class="block rounded-md border bg-blue-800 text-white shadow-sm px-4 py-2 text-sm font-medium hover:bg-blue-500 focus:relative">
                Shuffle
            </button>
            
            <button messages="click=reverse" class="block rounded-md border bg-blue-800 text-white shadow-sm px-4 py-2 text-sm font-medium hover:bg-blue-500 focus:relative">
                Reverse
            </button>
            
            <button messages="click=blackbox" class="block rounded-md border bg-blue-800 text-white shadow-sm px-4 py-2 text-sm font-medium hover:bg-blue-500 focus:relative">
                Blackbox
            </button>
            
            <button messages="click=changetag" class="block rounded-md border bg-blue-800 text-white shadow-sm px-4 py-2 text-sm font-medium hover:bg-blue-500 focus:relative">
                Change Tag
            </button>

        </header>${model?.blackbox ? "<!-- blackbox mode On -->" : ""}

        <div class="grid grid-cols-5 gap-2 my-4 overflow-auto h-1/2" ${model?.blackbox ? "blackbox" : ""}>
        ${(model?.items ?? []).map((i, idx) => /*html*/`
            <${model.tag ?? "div"} class="p-4 bg-gray-100 rounded-lg text-xl font-semibold" ids="item${i}">Item #${i}</${model.tag ?? "div"}>
        `).join("")}
        </div>${model?.blackbox ? "" : "<!-- blackbox mode Off -->"}


        ${Array.from({ length: Math.ceil(model.arr.length / 200) }, (_, i) => model.arr.slice(i * 200, i * 200 + 200)).map((arr, mult) => /*html*/`
            <div class="grid grid-cols-3 gap-1">
                ${arr.map((i, idx) => /*html*/`
                    <div  id="card${(idx+1)*(mult+1)}" role="alert" class="rounded-xl border border-gray-100 bg-white p-4">
                        <div class="flex items-start gap-4">
                            <span  class="text-green-600">
                            <svg 
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                                class="size-6"
                            >
                                <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            </span>

                            <div class="flex-1">
                                <strong class="block font-medium text-gray-900"> 
                                    Item #${(idx+1)*(mult+1)}
                                    <br>
                                    Random #${Math.round(Math.random()*1000)}
                                </strong>

                                <p  class="mt-1 text-sm text-gray-700">Your product changes have been saved.</p>
                            </div>

                            <button  class="text-gray-500 transition hover:text-gray-600">
                                <span class="sr-only">Dismiss popup</span>

                                <svg 
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="currentColor"
                                    class="size-6"
                                >
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                `).join("")}
            </div>
        `).join("")}

    </body>
`;

render({
    model: {
        name: "Jorge Luis",
        items: Array(100).fill(0).map((i, idx) => idx),
        count: 0,
        reverseEvent: true
    },
    controller: (model, message) => {
        
        if(message?.name == "add") model.count = (model.count ?? 0) + 1;
        if(message?.name == "add100") model.count = (model.count ?? 0) + 100;
        if(message?.name == "sub") model.count = (model.count ?? 0) -1;
        if(message?.name == "reset") model.count = 0;

        model.arr = Array.from({ length: model.count ?? 0 }, (_, i) => i + 1); 

        if(message?.name == "reverseToggle") model.items = model.items.sort(() => Math.random() - 0.5);
        if(message?.name == "reverse") model.items.reverse();
        if(message?.name == "blackbox") model.blackbox = !model.blackbox;
        if(message?.name == "changetag") model.tag = model.tag == "span" ? "div" : "span";

        return {model, html: view(model)};

    }
});
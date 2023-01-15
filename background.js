console.log("Starting ezfluent background...");

// function logURL(requestDetails) {
//     console.log("BG : Chargement : " + requestDetails.url);

//     var querying = browser.tabs.query({
//         active: true,
//         currentWindow: true
//     });
//     querying.then((tabs) => messageTab(tabs, requestDetails));
// }
  
browser.webRequest.onBeforeRequest.addListener(
    quizListener,
    {urls: ["*://portal.gofluent.com/mobile-rest/ws/quiz"]},
    ["blocking"]
);

browser.webRequest.onBeforeRequest.addListener(
    articleListener,
    {urls: ["*://portal.gofluent.com/mobile-rest/ws/trainingpath/tp/assigned/*"]},
    ["blocking"]
);

function quizListener(details) {
    let filter = browser.webRequest.filterResponseData(details.requestId);
    let decoder = new TextDecoder("utf-8");
    let encoder = new TextEncoder();

    let data = '';

    filter.ondata = (event) => {
        const str = decoder.decode(event.data, {stream: true});
        data += str;
        filter.write(encoder.encode(str));
    }

    filter.onstop = (event) => {
        filter.close();

        var querying = browser.tabs.query({
            active: true,
            currentWindow: true
        });

        querying.then((tabs) => {
            browser.tabs.sendMessage(tabs[0].id, JSON.stringify({type: 'quiz', data}));
        });
    }

    return;
}

function articleListener(details) {
    let filter = browser.webRequest.filterResponseData(details.requestId);
    let decoder = new TextDecoder("utf-8");
    let encoder = new TextEncoder();

    let data = '';

    filter.ondata = (event) => {
        const str = decoder.decode(event.data, {stream: true});
        data += str;
        filter.write(encoder.encode(str));
    }

    filter.onstop = (event) => {
        filter.close();

        var querying = browser.tabs.query({
            active: true,
            currentWindow: true
        });

        querying.then((tabs) => {
            browser.tabs.sendMessage(tabs[0].id, JSON.stringify({type: 'articles', data}));
        });
    }

    return;
}

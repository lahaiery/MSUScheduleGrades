chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      
        console.log(request.url);
        console.log(request.courses);
        let httpRequest = new XMLHttpRequest();
        httpRequest.open('POST', request.url, true);
        httpRequest.setRequestHeader('Content-Type', "application/json");
        httpRequest.onreadystatechange = function() // when the request is loaded
        { 
            //Check to ensure that the AJAX request returns with State "DONE" (value 4) and status 200
            if (httpRequest.readyState == 4 && httpRequest.status == 200) 
            {
                let response = JSON.parse(httpRequest.responseText);
                console.log(response);
                sendResponse({responseJSON: response})
            }
        };
        httpRequest.send(JSON.stringify(request.courses));
        return true;
    });
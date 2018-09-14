// JavaScript source code

//Base URL for all msugrades.com AJAX requests
const BASE_MSUGRADES_URL = "https://msugrades.com/"; 

//URL path to access msugrades.com API
const API_URL = "/api/v1/course/"; 

//The class and child elements required to locate the table header DOM
const TABLE_HEADER_DOM = ".col-md-12.table-bordered.table-striped.table-condensed.course-results.cf > thead > tr"; 

//Map to store associated course ID's, professor names, and grade data
var scheduleMap = new Map();


//Parses Planner page for all professor names
var professor = document.querySelectorAll('td[data-title="Instructor"]');

//Parses Planner page for all course numbers
var course = document.querySelectorAll('td[data-title="Course"]');

var header = document.querySelector(TABLE_HEADER_DOM);
addHeader("th", "Average GPA", "Th9", header)
addHeader("th", "Median GPA", "Th10", header)



/*Loops over all courses parsed on the page and strips down the course ID into subject and course number
also strips the professor name to first and last name. Adds each to an array, and sets the course array
to the key in the map, and associated professor as the value to the key.
*/
for(i = 0; i < course.length; i++)
{
    //Stores the resulted course text to the Coursename variable
    var courseName = course[i].innerText;

    //Splits the course into subject and course number
    var courseSplit = courseName.split(" ");
    var subject = courseSplit[0].trim();
    var courseNumber = courseSplit[1].trim();   

    //Stores the resulted professor text to the profName variable
    var profName = professor[i].innerText;

    //Prints out the name to the console for testing
    var lineSplit = profName.split("\n");
    lineSplit = lineSplit[0].trim()
    var nameSplit = lineSplit.split(".");

    //Store the professor first and last name to variables
    var firstName = nameSplit[0].trim();
    var lastName = nameSplit[1].trim();
    let avgGpa = "N/A";
    let medianGpa = "N/A";
    let detailedLink = "";

    //Create an array for the course and the professor containing subject, course number and first name, last name
    var courseArr = [subject, courseNumber];
    var nameArr = [firstName, lastName, avgGpa, medianGpa, detailedLink];
    
    //Adds the two arrays to a map, course ID is the key, professor name is value
    scheduleMap.set(courseArr, nameArr);
}

//AJAX request to process the msu grades page containing course information
var ajaxCounter = 0;
for (let [key] of scheduleMap.entries()) {
    let httpRequest = new XMLHttpRequest();

    httpRequest.onload = function(){ // when the request is loaded
        processRequest(httpRequest, key);// we're calling our method
    };

    httpRequest.open('GET', BASE_MSUGRADES_URL + API_URL + key[0] + "/" + key[1], true);
    console.log(BASE_MSUGRADES_URL + API_URL + key[0] + "/" + key[1])
    httpRequest.send();
    ajaxCounter++;
}
    
/** 
 *Function that runs after all AJAX calls are complete, parses through the returned JSON to find grade data. 
 * @param {Object} xhr - index of row in the table
 * @param {Object} key - the gpa to insert, either average or median
**/
function processRequest(xhr, key) {
    //Check to ensure that the AJAX request returns with State "DONE" (value 4) and status 200
    if (xhr.readyState == 4 && xhr.status == 200) {

        //HTML Response of the AJAX Request, Need to parse the AJAX for the proper data***
        var response = JSON.parse(xhr.responseText);
        for(let entry of (response["Entries"]))
        {
            //Find the name of the professor in the entries
            let name = entry["Instructor"];

            if(name.toLowerCase().includes(scheduleMap.get(key)[1].toLowerCase()))
            {                              
                //Ensure that Average GPA is a valid value in the JSON file
                if(entry["Grades"]["AverageGPA"])
                {
                    //Set the associated value in the map to the average GPA
                    scheduleMap.get(key)[2] = entry["Grades"]["AverageGPA"].toFixed(2);
                }
                //Ensure that Median GPA is a valid value in the JSON file
                if(entry["Grades"]["Median"])
                {
                    //Set the associated value in the map to the median GPA
                    scheduleMap.get(key)[3] = entry["Grades"]["Median"].toFixed(1) ;
                }        
                //Create a string representing the link to the detailed msugrades.com page for that professor
                var link = "course/" + key[0] + "/" + key[1] + "/" + name.replace(/ /g, "_");   
                //Set the associated value in the map to the link
                scheduleMap.get(key)[4] = link;               
            }            
        }
        
        //Once all AJAX calls have been processed, inject the html containing the retrieved data
        ajaxCounter--;   
        if(ajaxCounter == 0)
        {
            insertHTML();
        }   
    }         
}

/** 
 *Function that runs after all AJAX calls are complete. 
 *Calls injectHTML to inject the average and median gpa scraped from msu grades 
 *into the msu schedule builder website next to the appropriate professor name
**/
function insertHTML()
{
    let i =0;
    for (let [key, value] of scheduleMap.entries()) 
    {
        injectHTML(i, value[2], value[4]);
        injectHTML(i, value[3], value[4]);
        i++;
    }
}

/**
 * Helper function that injects html given a gpa (either average or median) and a link to the MSUGrades page.
 * @param {number} i - index of row in the table
 * @param {number} gpa - the gpa to insert, either average or median
 * @param {string} link - the link to the professor detail page on msugrades.com
**/
function injectHTML(i, gpa, link)
{
    //Creates a new td element for average/median grades with id and CSS class
    let td  = document.createElement("td");
    td.id = "MainContent_UCEnrl_rptPlanner_tdAVERAGEGPA" + i;
    td.className = "instructor-name";   

    //Locates the appropriate div to inject the td into in the HTML and appends it as a child 
    let avgContentDiv = document.querySelector("#MainContent_UCEnrl_rptPlanner_trMeeting_" + i);
    if(avgContentDiv == null)
    {
        avgContentDiv = document.querySelector("#MainContent_UCEnrolled_rptPlanner_trMeeting_" + i);
    }
    avgContentDiv.appendChild(td);

    if(gpa != "N/A")
    {
        //Creates a new HTML a element
        let a  = document.createElement("a");
        //Sets the link target to be a new tab
        a.target = "_blank";
        //Sets the link to the baseURL of msugrades.com + the link for that specific course/professor
        a.href =  BASE_MSUGRADES_URL + link; 
        a.title = "Click to visit MSU Grades";
        //Sets the inner HTML of the newly created td element to the gpa from the scheduleMap
        a.innerText = gpa;   
        td.appendChild(a);
    }
    else
    {
        td.innerText= gpa;
    }
}   

/**
 * Helper function that creates a header column in the schedule table
 * @param {string} element - string containing the type of html element to insert
 * @param {string} innerHTML- string containing the text to insert to the html element
 * @param {string} id - the id to attach to the element
 * @param {Object} parent - the parent of the element we are creating, location at which to append as a child
**/
function addHeader(element, innerHTML, id, parent)
{
    let newElement  = document.createElement(element);
    //Sets the inner HTML of the newly created element
    newElement.innerHTML = innerHTML
    //Sets the ID of the newly created element
     newElement.id = id
    //Appends the header to the parent in theDOM
    parent.appendChild(newElement);
}


//** TESTING WITH MUTATION OBSERVERS **//

/*
MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

var observer = new MutationObserver(function(mutations, observer) {
    console.log("TEST!");
    main();
    // Later, you can stop observing
    observer.disconnect();
});

// define what element should be observed by the observer
    // and what types of mutations trigger the callback
    observer.observe(document, {
        subtree: true,
        attributes: true
        //...
    });
*/

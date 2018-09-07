// JavaScript source code

const BASEMSUGRADESURL = "https://msugrades.com"; //Base URL for all MSUgrades.com AJAX requests

//Parses Planner page for all professor names
var professor = document.querySelectorAll('td[data-title="Instructor"]');

//Parses Planner page for all course numbers
var course = document.querySelectorAll('td[data-title="Course"]');

//Create a new map to store associated course ID's and professor names
var scheduleMap = new Map();

//Inserts an Avg. GPA column in the schedule builder table
var avg_th  = document.createElement("th");
//Sets the inner HTML of the newly created th element
avg_th.innerHTML = 'Average GPA'
avg_th.id = "Th9";
var header = document.querySelector("#MainContent_UCEnrl_rptPlanner_trHeader > tr");
header.appendChild(avg_th);

//Inserts a Median GPA column in the schedule builder table
var median_th  = document.createElement("th");
//Sets the inner HTML of the newly created th element
median_th.innerHTML = 'Median GPA'
median_th.id = "Th10";
header.appendChild(median_th);

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

    httpRequest.open('GET', BASEMSUGRADESURL + "/course" + "/" + key[0] + "/" + key[1], true);
    httpRequest.send();
    ajaxCounter++;
}
 
//Function to run once the AJAX request returns
function processRequest(xhr, key) {
    //Check to ensure that the AJAX request returns with State "DONE" (value 4) and status 200
    if (xhr.readyState == 4 && xhr.status == 200) {

        //HTML Response of the AJAX Request, Need to parse the AJAX for the proper data***
        var response = xhr.responseText;

        parser=new DOMParser();
        htmlDoc = parser.parseFromString(response, "text/html");

       //Number of rows in the table of the course page.
        var i = 0;
        let lastColumn = false;
        while(!lastColumn)
        {
            //The id of the row of the table, given by "tab" + the row number (i)
            var tabNumber = "#tab" + String(i);

            //Parses the professor name from the first column of the table
            var container = htmlDoc.querySelector(tabNumber);
            if(container != null)
            {
                i++;
                var nameMatches = container.querySelectorAll("h3");
                var professorName = nameMatches[0].innerText;

                //Parses the average and median GPA from the second column of the table
                var gradeMatches = container.querySelectorAll("p > em");

                var linkMatches = container.querySelectorAll("p > a");

                if(gradeMatches[0] !== undefined)
                {
                    var avgGPA = gradeMatches[0].innerText;
                    var medianGPA = gradeMatches[1].innerText;
                    var link = linkMatches[0].getAttribute("href");

                    if(professorName.toLowerCase().includes(scheduleMap.get(key)[1].toLowerCase()))
                    {
                        scheduleMap.get(key)[2] = avgGPA;
                        scheduleMap.get(key)[3] = medianGPA;      
                        scheduleMap.get(key)[4] = link;     
                    }
                }       
            }
            else
            {
                lastColumn = true;
            }  
        }  
        ajaxCounter--;   
        if(ajaxCounter == 0)
        {
            insertHTML();
        }   
    }   
}

/*
Function that runs after all AJAX calls are complete. 
Calls injectHTML to inject the average and median gpa scraped from msu grades 
into the msu schedule builder website next to the appropriate professor name
*/
function insertHTML()
{
    let i =0;
    for (var [key, value] of scheduleMap.entries()) 
    {
        injectHTML(i, value[2], value[4]);
        injectHTML(i, value[3], value[4]);
        i++;
    }
}

/*
Helper function that injects html given a gpa (either average or median) and a link to the MSUGrades page.
*/
function injectHTML(i, gpa, link)
{
    //Creates a new td element for average/median grades with id and CSS class
    let td  = document.createElement("td");
    td.id = "MainContent_UCEnrl_rptPlanner_tdAVERAGEGPA" + i;
    td.className = "instructor-name";   

    //Locates the appropriate div to inject the td into in the HTML and appends it as a child 
    let avgContentDiv = document.querySelector("#MainContent_UCEnrl_rptPlanner_trMeeting_" + i);
    avgContentDiv.appendChild(td);

    if(gpa != "N/A")
    {
        //Creates a new HTML a element
        let a  = document.createElement("a");
        //Sets the link target to be a new tab
        a.target = "_blank";
        //Sets the link to the baseURL of msugrades.com + the link for that specific course/professor
        a.href =  BASEMSUGRADESURL + link; 
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
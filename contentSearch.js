// Content Script that runs on the default search page of schedule.msu.edu

//Base URL for all msugrades.com AJAX requests
const BASE_MSUGRADES_URL = "https://msugrades.com/"; 

//URL path to access msugrades.com API
const API_URL = "api/v1/course/"; 

//The class and child elements required to locate the table header DOM
const TABLE_HEADER_DOM = ".col-md-12.table-bordered.table-striped.table-condensed.course-results.cf > thead > tr"; 

//Constants to represent the index of information fields in an array
const subjectIndex = 0;
const courseNumberIndex = 1;
const firstNameIndex = 0;
const lastNameIndex = 1;
const avgGPAIndex = 2;
const medianGPAIndex = 3;
const linkIndex = 4;
const numProfsIndex = 5;

//Map to store associated course ID's, professor names, and grade data
var scheduleMap = new Map();

//Counter to track the number of outstanding AJAX calls not yet returned
var ajaxCounter = 0;

//Parses Planner page for all professor names
var container = null; 

//Collection of all course tables on the page
var rows = null;
//Collection of all course headings on the page
var courses = null;

//Counter to keep track of how many courses are currently enrolled
var numCourses = 0;

main();

/**
 * Main function that parses schedule builder site, creates map of professors, and associated course information
 */
function main()
{
    container = document.querySelector('#MainContent_divHeader1_va');

    if(container != null)
    {
        rows = container.querySelectorAll('.col-md-12.table-bordered.table-striped.table-condensed.course-results.cf');
        courses = container.querySelectorAll('h3 > a');
        numCourses = courses.length;
    }
    
    /**
     * Loops over all courses parsed on the page and strips down the course ID into subject and course number
     * also strips the professor name to first and last name. Adds each to an array, and sets the course array
     * to the key in the map, and associated professor as the value to the key.
    **/
    if(courses != null)
    {
        for(i = 0; i< numCourses; i++)
        {
            //Parses Planner page for all course numbers
            let courseName = courses[i].innerText;

            //Splits the course into subject and course number
            let courseSplit = courseName.split(" ");
            let subject = courseSplit[0].trim();
            let courseNumber = courseSplit[1].trim();   

            let row = rows[i].querySelectorAll('tbody > tr');
            for(j = 0; j < row.length; j++)
            {
                if(row[j].className == 'meeting-time')
                {
                    if(row[j-1].className != 'meeting-time')
                    {
                        let professor = row[j].querySelectorAll('td[data-title="Instructor"]');

                        //Stores the resulted professor text to the profName variable
                        let profName = professor[0].innerText;

                        let firstName = "";
                        let lastName = "";

                        if(profName != "")
                        {
                            let lineSplit = profName.split("\n");
                            lineSplit = lineSplit[0].trim()
                            let nameSplit = lineSplit.split(".");

                            //Store the professor first and last name to variables in the map
                            firstName = nameSplit[0].trim().toLowerCase();
                            lastName = nameSplit[1].trim().toLowerCase();
                        }

                        //Store the median and average gpa to variables in the map
                        let avgGpa = "N/A";
                        let medianGpa = "N/A";

                        //Store the msugrades.com link and the number of rows per course to the map
                        let detailedLink = "";
                        let numProfs = 1
                        //If there are two tr elements per course, only fill 1 with gpa
                        if(j+1 < row.length && row[j+1].className == 'meeting-time')
                        {
                            numProfs = 2;
                        }
                        //Create an array for the course and the professor containing subject, course number and first name, last name
                        let courseArr = [subject, courseNumber];
                        let nameArr = [firstName, lastName, avgGpa, medianGpa, detailedLink, numProfs];

                        //Adds the two arrays to a map, course ID is the key, professor name is value
                        scheduleMap.set(courseArr, nameArr);
                    }         
                }   
            }
            let httpRequest = new XMLHttpRequest();

            httpRequest.onload = function() // when the request is loaded
            { 
                //Process the return of the AJAX request
                processRequest(httpRequest, subject, courseNumber);
            };

            httpRequest.open('GET', BASE_MSUGRADES_URL + API_URL + subject + "/" + courseNumber, true);
            httpRequest.send();
            ajaxCounter++;          
        }
    }
    //Release memory
    rows = null;
    courses = null;
}

/** 
 *Function that runs after all AJAX calls are complete, parses through the returned JSON to find grade data. 
 * @param {Object} xhr - index of row in the table
 * @param {Object} key - the gpa to insert, either average or median
**/
function processRequest(xhr, subject, courseNumber) 
{
    //Check to ensure that the AJAX request returns with State "DONE" (value 4) and status 200
    if (xhr.readyState == 4 && xhr.status == 200) 
    {
        //HTML Response of the AJAX Request, Need to parse the AJAX for the proper data***
        let response = JSON.parse(xhr.responseText);
        let profMap = new Map();
        let profName = null;

        for(let entry of (response["Entries"]))
        {
            //Find the name of the professor in the entries
            let name = entry["Instructor"];

            let lineSplit = name.split("\n");
            lineSplit = lineSplit[0].trim()
            let nameSplit = lineSplit.split(" ");

            let firstName = ""
            let lastName = ""

            //Store the professor first and last name to variables in the map
            //If there is no middle initial
            if(nameSplit.length == 2)
            {
                firstName = nameSplit[0].trim().toLowerCase();
                lastName = nameSplit[1].trim().toLowerCase();
            }
            //If there is a middle initial
            else if(nameSplit.length == 3)
            {
                firstName = nameSplit[0].trim().toLowerCase();
                lastName = nameSplit[2].trim().toLowerCase();
            }
            profName = firstName[0] + " " + lastName;

            let median = "N/A";
            let average = "N/A";

            //Ensure that Average GPA is a valid value in the JSON file
            if(entry["Grades"]["AverageGPA"])
            {
                //Set the associated value in the map to the average GPA
                average = entry["Grades"]["AverageGPA"].toFixed(2);
            }
            //Ensure that Median GPA is a valid value in the JSON file
            if(entry["Grades"]["Median"])
            {
                //Set the associated value in the map to the median GPA
                median = entry["Grades"]["Median"].toFixed(1) ;
            }   
            //Create a string representing the link to the detailed msugrades.com page for that professor
            let link = "course/" + subject + "/" + courseNumber + "/" + name.replace(/ /g, "_"); 

            let data = [average, median, link];
            profMap.set(profName, data);
        }

        for([course,info] of scheduleMap.entries())
        {
            if(course[subjectIndex] == subject && course[courseNumberIndex] == courseNumber)
            {
                nameArr = info[firstNameIndex] + " " + info[lastNameIndex];
                let match = profMap.get(nameArr);
                if(match != undefined)
                {
                    //Set the associated value in the map to the average GPA
                    info[avgGPAIndex] = match[0];
                    //Set the associated value in the map to the median GPA
                    info[medianGPAIndex] = match[1];
                    //Set the associated value in the map to the link
                    info[link] = match[2];
                }               
            }        
        } 
    //Once all AJAX calls have been processed, inject the html containing the retrieved data               
    } 
    ajaxCounter--;   
    if(ajaxCounter == 0)
    {
        insertHTML();
    }  
}

/** 
 *Function that runs after all AJAX calls are complete. 
 *Calls injectHTML to inject the average and median gpa scraped from msu grades 
 *into the msu schedule builder website next to the appropriate professor name
**/
function insertHTML()
{
    let header = document.querySelectorAll(TABLE_HEADER_DOM);
    let i =0;

    //Inserts header based on how many courses there are in the search results
    for(j = 0; j< numCourses; j++)
    {
        addHeader("th", "Average GPA", header[j])
        addHeader("th", "Median GPA", header[j])
    }

    //Adjust the final exam/ extra information line for the newly inserted columns
    let footer = document.querySelectorAll("td.section-text")
    for(footr of footer)
    {
        footr.colSpan = "13";
    }

    //Injects grade html based on how many professors there are listed for each course
    for (let value of scheduleMap.values()) 
    {  
        injectHTML(i, value[avgGPAIndex], value[linkIndex]);
        injectHTML(i, value[medianGPAIndex], value[linkIndex]);

        //If there is more than one row for the course, insert extra empty rows to balance the table.
        if(value[5] > 1)
        {           
            i++;   
            injectHTML(i, " ", " ");   
            injectHTML(i, " ", " ");       
        }
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
    td.className = "instructor-name"; 
    
    //Locates the appropriate div to inject the td into in the HTML and appends it as a child 
    let avgContentDiv = document.querySelectorAll("tr.meeting-time");
    avgContentDiv[i].appendChild(td);

    //If there was a gpa found for the professor, create an html a element to link to the msugrades.com page
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
    //If there was no gpa found for the professor, do not insert a link
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
function addHeader(element, innerHTML, parent)
{
    let newElement  = document.createElement(element);
    //Sets the inner HTML of the newly created element
    newElement.innerHTML = innerHTML
    //Appends the header to the parent in theDOM
    parent.appendChild(newElement);  
}

/* This section of code sets up a mutation observer to observe for AJAX Post requests
 * If a mutation is observed, the script runs the main function again to retrieve the new
 * information posted to the page.
*/

// Select the node that will be observed for mutations
var targetNode = document.getElementById('MainContent_updDropDowns');
if(targetNode != null)
{ 
    // Options for the observer (which mutations to observe)
    var config = { attributes: true, childList: true, subtree: true };

    // Callback function to execute when mutations are observed
    var callback = function(mutationsList) 
    {
        for(var mutation of mutationsList) 
        {
            if (mutation.type == 'childList') 
            {
                if(mutation.target == targetNode)
                {
                    //If the mutations are to the entire course table, a new semester has been selected
                    //Call main function to start parsing proccess over for new courses and professors.
                    main();
                }
            }
        }
    };
    // Create an observer instance linked to the callback function
    var observer = new MutationObserver(callback);

    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);
}
// Content Script that runs on the planner page of schedule.msu.edu

//Base URL for all msugrades.com AJAX requests
const BASE_MSUGRADES_URL = "https://msugrades.com/"; 

//URL path to access msugrades.com API
const API_URL = "api/v1/courses"; 

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
const tblIndex = 6;

//Map to store associated course ID's, professor names, and grade data
var scheduleMap = new Map();

var coursesArray = [];

//Counter to keep track of how many courses are currently enrolled
var enrlled = 0;

//Counter to keep track of how many courses are currently planned
var planned = 0;

main();

/**
 * Main function that parses schedule builder site, creates map of professors, and associated course information
 */
function main()
{
    scheduleMap.clear();
    coursesArray = [];

    //Parses Planner page for the Enrolled courses table
    var enrl = document.querySelector('#MainContent_divEnrolled');

    //Parses Planner page for the Planned courses table
    var plan = document.querySelector('#MainContent_divPlanned');

    var rowsEnrl = null;
    if(enrl != null)
    {
        //Parses Enrolled table for all course rows
        rowsEnrl = enrl.querySelectorAll('tbody[class="course-data"]');
        //Saves the number of courses that are enrolled to a variable
        enrlled = rowsEnrl.length;
    }
    
    var rowsPlan = null;
    if (plan != null)
    {
        //Parses Planned table for all course rows
        rowsPlan = plan.querySelectorAll('tbody[class="course-data"]');
        //Saves the number of courses that are planned to a variable
        planned = rowsPlan.length;
    }

    /**
     * Loops over all courses parsed on the enrolled and planned tables and calls function parse
     * to strip down the course ID into subject and course number
     * Also strips the professor name to first and last name. Adds each to an array, and sets the course array
     * to the key in the map, and associated professor as the value to the key.
    **/
    if(rowsEnrl != null)
    {
        for(row of rowsEnrl)
        {
            parse(row, "enrl");
        }
    }
    if(rowsPlan != null)
    {
        for(row of rowsPlan)
        {
            parse(row, "plan");
        }
    }

    let url = BASE_MSUGRADES_URL + API_URL;
    chrome.runtime.sendMessage({url: url, courses: coursesArray}, function(response) {
        processRequest(response.responseJSON, coursesArray);
    });
}

/**
 * Function that parses professor names, course id and number from the table and saves the information to scheduleMap
 * @param {Object} row - the row of the table to parse through
 * @param {string} tbl - the table the row is located in (enrolled or planned)
 */
function parse(row, tbl)
{
    //Parses Planner page for all course numbers
    let course = row.querySelectorAll('td[data-title="Course"]');

    let professor = row.querySelectorAll('td[data-title="Instructor"]');

    //Gets the course id (Ex: CSE, MTH, etc.)
    let courseName = course[subjectIndex].innerText;

    //Splits the course into id (Ex: CSE, MTH, etc.) and course number (Ex: 100, 444, etc.)
    let courseSplit = courseName.split(" ");
    let subject = courseSplit[subjectIndex].trim();
    let courseNumber = courseSplit[courseNumberIndex].trim();   

    //Stores the resulted professor text to the profName variable
    let profName = professor[0].innerText;

    //Professor first and last names
    let firstName = "";
    let lastName = "";

    //Checks if the professor's name is empty, if so do not attempt to split an empty string
    if(profName != "")
    {
        let lineSplit = profName.split("\n");
        lineSplit = lineSplit[0].trim()
        let nameSplit = lineSplit.split(".");

        //Store the professor first and last name to variables in the map
        firstName = nameSplit[firstNameIndex].trim().toLowerCase();
        lastName = nameSplit[lastNameIndex].trim().toLowerCase();
    }

    //Store the median and average gpa to variables in the map
    let avgGpa = "N/A";
    let medianGpa = "N/A";

    //Store the msugrades.com link and the number of rows per course to the map
    let detailedLink = "";
    let numProfs = professor.length

    //Create an array for the course including id and number
    let courseArr = [subject, courseNumber];

    //Create an array for the professor and other info including: first and last name, avg and median GPA, external link
    //The number of professors listed under that course (row), and which table this course was listed under (Enrolled or Planned)
    let nameArr = [firstName, lastName, avgGpa, medianGpa, detailedLink, numProfs, tbl];
    
    //Adds the two arrays to a map, course ID is the key, professor name is value
    scheduleMap.set(courseArr, nameArr);
    let courseCombination = subject + " " + courseNumber;
    coursesArray.push(courseCombination);
}

/** 
 *Function that runs after all AJAX calls are complete, parses through the returned JSON to find grade data. 
 * @param {Object} xhr - index of row in the table
 * @param {Object} coursesArray - the array of courses in the planner page
**/
function processRequest(response, coursesArray) {
    
    //HTML Response of the AJAX Request, Need to parse the AJAX for the proper data***
    let profMap = new Map();
    let profName = null;

    for(let course of coursesArray){

        profs = response[course];

        let courseSplit = course.split("\n");
        courseSplit = courseSplit[0].trim()
        let courseArr = courseSplit.split(" ");

        let subject = courseArr[0];
        let courseNumber = courseArr[1];

        for(let prof of profs){
            //Find the name of the professor in the entries
            let name = prof["Instructor"];

            let lineSplit = name.split("\n");
            lineSplit = lineSplit[0].trim()
            let nameSplit = lineSplit.split(" ");

            let firstName = "";
            let lastName = "";

            //If there is a middle initial
            if(nameSplit.length >= 1)
            {
                firstName = nameSplit[0].trim().toLowerCase();
                lastName = nameSplit[nameSplit.length - 1].trim().toLowerCase();
            }
            profName = firstName[0] + " " + lastName;

            let median = "N/A";
            let average = "N/A";

            //Ensure that Average GPA is a valid value in the JSON file
            if(prof["AverageGrade"])
            {
                //Set the associated value in the map to the average GPA
                average = prof["AverageGrade"].toFixed(2);
            }
            //Ensure that Median GPA is a valid value in the JSON file
            if(prof["MedianGrade"])
            {
                //Set the associated value in the map to the median GPA
                median = prof["MedianGrade"].toFixed(1) ;
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
                    info[linkIndex] = match[2];
                }               
            }        
        } 
    }
    insertHTML();      
}

/** 
 *Function that runs after all AJAX calls are complete. 
 *Calls injectHTML to inject the average and median gpa scraped from msu grades 
 *into the msu schedule builder website next to the appropriate professor name
**/
function insertHTML()
{
    //Finds the table header element for the enrolled and planned tables
    let header = document.querySelectorAll(TABLE_HEADER_DOM);

    //Iterates over the table headers and insert new headers for Average GPA and Median GPA
    for(let k = 0; k < header.length; k++)
    {
        //Checks that the enrolled table is not empty before inserting new headers
        if(k == 0 && enrlled > 0)
        {
            addHeader("th", "Average GPA", "Th9", header[k])
            addHeader("th", "Median GPA", "Th10", header[k])
        }
        //Checks that the planned table is not empty before inserting new headers
        else if(k == 1 && planned > 0)
        {         
            addHeader("th", "Average GPA", "Th9", header[k])
            addHeader("th", "Median GPA", "Th10", header[k])

            let plan = document.querySelector('#MainContent_divPlanned');
            let footer = plan.querySelectorAll("td.section-text")
            //Adjusts the colSpan attribute of the section information row to account for the newly inserted columns
            for(footr of footer)
            {
                footr.colSpan = "13";
            }
        }     
    }
    //Counter for the current element in the enrolled table to be inserted
    let i = 0;
    //Counter for the current element in the planned table to be inserted
    let j = 0;

    //Iterates over each element in the scheduleMap and inserts the associated grade information into the table
    for (let value of scheduleMap.values()) 
    {
        //If the current entry should be inserted into the enrolled table
        if(value[tblIndex] == "enrl")
        {
            //Injects two elements of HTML, one for the average gpa and one for the median gpa
            injectHTML(i, value[avgGPAIndex], value[linkIndex], value[tblIndex]);
            injectHTML(i, value[medianGPAIndex], value[linkIndex], value[tblIndex]);
    
            //If there is more than one row for the course, insert extra empty rows to balance the table.
            if(value[numProfsIndex] > 1)
            {       
                //Iterate the counter to the next element    
                i++;  
                injectHTML(i, " ", " ", value[tblIndex]);   
                injectHTML(i, " ", " ", value[tblIndex]);       
            }
            //Iterate the counter to the next element
            i++;
        }

        //If the current entry should be inserted into the planned table
        else if(value[tblIndex] == "plan")
        {
            //Injects two elements of HTML, one for the average gpa and one for the median gpa
            injectHTML(j, value[avgGPAIndex], value[linkIndex], value[tblIndex]);
            injectHTML(j, value[medianGPAIndex], value[linkIndex], value[tblIndex]); 
            
            //If there is more than one row for the course, insert extra empty rows to balance the table.
            if(value[numProfsIndex] > 1)
            {     
                //Iterate the counter to the next element      
                j++;                  
                injectHTML(j, " ", " ", value[tblIndex]);   
                injectHTML(j, " ", " ", value[tblIndex]);       
            }
            //Iterate the counter to the next element
            j++;
        }        
    }
}

/**
 * Helper function that injects html given a gpa (either average or median) and a link to the MSUGrades page.
 * @param {number} i - index of row in the table
 * @param {number} gpa - the gpa to insert, either average or median
 * @param {string} link - the link to the professor detail page on msugrades.com
**/
function injectHTML(i, gpa, link, tbl)
{
    //Creates a new td element for average/median grades with id and CSS class
    let td  = document.createElement("td");  
    td.className = "instructor-name";  

    let avgContentDiv = null;

    if(tbl == "enrl")
    {
        td.id = "MainContent_UCEnrl_rptPlanner_tdAVERAGEGPA" + i;
    
        //Locates the appropriate div to inject the td into in the HTML and appends it as a child 
        avgContentDiv = document.querySelector("#MainContent_UCEnrl_rptPlanner_trMeeting_" + i);
        if(avgContentDiv == null)
        {
            avgContentDiv = document.querySelector("#MainContent_UCEnrolled_rptPlanner_trMeeting_" + i);
        }
    }
    else if(tbl == "plan")
    {
        td.id = "MainContent_UCPlan_rptPlanner_tdAVERAGEGPA" + i;

        //Locates the appropriate div to inject the td into in the HTML and appends it as a child 
        avgContentDiv = document.querySelector("#MainContent_UCPlan_rptPlanner_trMeeting_" + i);
        if(avgContentDiv == null)
        {
            avgContentDiv = document.querySelector("#MainContent_UCPlanned_rptPlanner_trMeeting_" + i);
        }
    }
      
    avgContentDiv.appendChild(td);

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
function addHeader(element, innerHTML, id, parent)
{
    //Creates a new HTML element with the provided type (element)
    let newElement  = document.createElement(element);
    //Sets the inner HTML of the newly created element (innerHTML)
    newElement.innerHTML = innerHTML
    //Sets the ID of the newly created element (id)
    newElement.id = id
    //Appends the header to the parent in theDOM
    parent.appendChild(newElement);
}

/* This section of code sets up a mutation observer to observe for AJAX Post requests
 * If a mutation is observed, the script runs the main function again to retrieve the new
 * information posted to the page.
*/

// Select the node that will be observed for mutations
var targetNode = document.getElementById('MainContent_updpnl');

if(targetNode != null)
{
    // Options for the observer (which mutations to observe)
    var config = { attributes: true, childList: true, subtree: true };

    // Callback function to execute when mutations are observed
    var callback = function(mutationsList) {
        for(var mutation of mutationsList) {
            if (mutation.type == 'childList') {
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
// JavaScript source code

//var baseKoofersURL = "https://www.koofers.com/search?q=";

var baseMSUGradesURL = "https://msugrades.com/course/";

//Queries the document to get the instructor name of the first course listed.

//Can adjust which professor it selects by changing the array value 
var professor = document.querySelectorAll(".instructor-name a")[0];
var course = document.querySelectorAll(".section-number a")[0];

//Stores the resulted text to the name variable
var profName = professor.innerText;
var courseName = course.innerText;

//Prints out the name to the console for testing

var nameSplit = profName.split(".");
var courseSplit = courseName.split(" ");

//Removes all whitespace from a string
//courseName = courseName.replace(/\s+/g, "");

//Store the professor first and last name to variables
var firstName = nameSplit[0].trim();
var lastName = nameSplit[1].trim();

//Store the subject code and course number of the class
var subject = courseSplit[0].trim();
var courseNumber = courseSplit[1].trim();

//Testing name split accuracy
console.log(subject);
console.log(courseNumber);
console.log(firstName);
console.log(lastName);


//AJAX request to process the msu grades page containing course information
var xhr = new XMLHttpRequest();
xhr.open('GET', "https://msugrades.com/course/CSE/232", true);
xhr.send();

//Event listener for returning the page information
xhr.addEventListener("readystatechange", processRequest, false);

xhr.onreadystatechange = processRequest;
 
//Function to run once the AJAX request returns
function processRequest(e) {
    //Check to ensure that the AJAX request returns with State "DONE" (value 4) and status 200
    if (xhr.readyState == 4 && xhr.status == 200) {

        //HTML Response of the AJAX Request, Need to parse the AJAX for the proper data***
        var response = xhr.responseText;
        //console.log(response);

        parser=new DOMParser();
        htmlDoc=parser.parseFromString(response, "text/html");
        test = document.getElementsByTagName("tr");  
        console.log(test);
    }
}







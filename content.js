// JavaScript source code

var baseKoofersURL = "https://www.koofers.com/search?q=";

//Queries the document to get the instructor name of the first course listed.
var spanElement = document.querySelectorAll(".instructor-name a")[0];

//Stores the resulted text to the name variable
var name = spanElement.innerText;

//Prints out the name to the console for testing
console.log(name);

var nameSplit = name.split(".");

var firstName = nameSplit[0];
var lastName = nameSplit[1];

lastName = lastName.trim();
//Testing name split accuracy
console.log(firstName);
console.log(lastName);

//Creates a koofers Search link based on first initial and last name of professor from table.
var koofersSearch = baseKoofersURL + firstName + "%20" + lastName;

//Prints the link to the console for testing
console.log(koofersSearch);




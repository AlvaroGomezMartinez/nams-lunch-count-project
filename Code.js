// Trigger function to run every day to create a new sheet
function createDailySheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const date = new Date();
  const sheetName = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const sheet = ss.insertSheet(sheetName);
  
  // Set up headers in the new sheet
  sheet.appendRow(['Timestamp', 'ID', 'Name']);
}

// Function to validate ID and autofill names in the form
function doGet(e) {
  const studentID = e.parameter.id;
  const template = HtmlService.createTemplateFromFile('Form');

  if (studentID) {
    const studentData = getStudentDataByID(studentID);
    if (studentData) {
      template.studentID = studentData.id;
      template.name = studentData.lastName;
    } else {
      template.error = "Invalid Student ID";
    }
  }

  return template.evaluate().setTitle('Lunch Count Form');
}

function getStudentDataByID(id) {
  const spreadsheetId = '1O3DSgTbhphNVDXLmlGkEiyVejsL_l4fPsf2cJJpQpTo'; // NAMS 2024-25 Criteria Sheet
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName('Active');
  const data = sheet.getDataRange().getValues();

  for (let i = 3; i < data.length; i++) {
    if (data[i][0] == id) {
      return {
        id: data[i][5],
        name: data[i][0],
      };
    }
  }

  return null;
}

// Function to handle form submissions
function doPost(e) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const date = new Date();
  const sheetName = Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const sheet = ss.getSheetByName(sheetName);

  const studentID = e.parameter.id;
  const name = e.parameter.name;
  const timestamp = new Date();

  sheet.appendRow([timestamp, studentID, name]);

  return HtmlService.createHtmlOutput('Thank you! Your response has been recorded.');
}

/**
 * @author Alvaro Gomez
 * Academic Technology Coach
 * Office: 210-397-9408
 * Cell: 210-363-1577
 */

/**
 * Serves the HTML file when the web app is accessed.
 *
 * @returns {HtmlOutput} The HTML content to be served.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Form');
}

let studentDataMap = {};

/**
 * Adds a custom menu to the Google Sheets UI when the document is opened.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('NAMS Meal Count Information')
    .addItem('Click here for information', 'showInfoDialog')
    .addToUi();
}

/**
 * Opens a modal dialog with information and hyperlinks.
 */
function showInfoDialog() {
  const htmlContent = HtmlService.createHtmlOutputFromFile('InfoDialog')
    .setWidth(800)
    .setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(htmlContent, 'Project Information');
}


/**
 * Loads student data from a Google Spreadsheet and caches it in script properties.
 * 
 * This function retrieves student data from two sheets ("Active" and "Allergies") in a 
 * specified spreadsheet. It maps student IDs to their respective allergies data, 
 * and then stores this information in the `studentDataMap`.
 */
function loadStudentData() {
  try {
    const criteriaSheet = '1O3DSgTbhphNVDXLmlGkEiyVejsL_l4fPsf2cJJpQpTo';
    const studentData = SpreadsheetApp.openById(criteriaSheet);

    // Load data from "Active" sheet
    const activeSheet = studentData.getSheetByName('Active');
    const lastRow = activeSheet.getLastRow();
    const lastColumn = activeSheet.getLastColumn();
    const activeData = activeSheet.getRange(2,1,lastRow, lastColumn).getValues();

    // Filter out rows where all values are empty ("" or equivalent empty)
    const filteredData = activeData.filter(row => row.some(cell => cell !== '' && cell !== 0 && cell !== false));

    // Load data from "Allergies" sheet
    const allergiesSheet = studentData.getSheetByName('Allergies');
    const allergiesSheetLastRow = allergiesSheet.getLastRow();
    const allergiesSheetLastColumn = allergiesSheet.getLastColumn();
    const allergiesData = allergiesSheet.getRange(2,1,allergiesSheetLastRow,allergiesSheetLastColumn).getValues();

    studentDataMap = {};  // Clear existing data

    // Create a map for student ID -> allergies data (from columns D and E in "Allergies" sheet)
    let allergiesMap = {};
    for (let i = 0; i < allergiesData.length; i++) {
      let row = allergiesData[i];
      let studentId = row[1].toString().trim();  // Student ID is in column B
      let medAlertCode = row[3].toString().trim();  // Column D
      let medAlertComment = row[4].toString().trim();  // Column E
      if (studentId !== '') {
        allergiesMap[studentId] = {
          medAlertCode: medAlertCode || '',
          medAlertComment: medAlertComment || ''
        };
      }
    }

    // Match "Active" student IDs with data from "Allergies" and build the studentDataMap
    for (let i = 0; i < filteredData.length; i++) {
      let row = filteredData[i];
      let colF = row[5].toString().trim();  // Student ID from "Active"
      let colA = row[0].toString().trim();  // Student Name
      if (colF !== '' && colA !== '') {
        // Get allergies data if available
        let allergies = allergiesMap[colF] || { medAlertCode: '', medAlertComment: '' };

        // Store student data in studentDataMap
        studentDataMap[colF] = {
          name: colA,
          medAlertCode: allergies.medAlertCode,
          medAlertComment: allergies.medAlertComment
        };
      }
    }

    // Cache the studentDataMap
    PropertiesService.getScriptProperties().setProperty('studentDataMap', JSON.stringify(studentDataMap));
  } catch (e) {
    console.error('Error loading student data: ', e);
    throw new Error('Failed to load student data');
  }
}

/**
 * Initializes the student data by loading it from the source spreadsheet.
 * 
 * This function is used to add student data to the Project Settings Script Properties.
 * A trigger is set to run this function daily so that the script property contains the most
 * recent data from the "Criteria Sheet".
 */
function initializeData() {
  loadStudentData();
}

/**
 * Retrieves cached student data from script properties, or loads it if not available.
 */
function getCachedStudentData() {
  const cachedData = PropertiesService.getScriptProperties().getProperty('studentDataMap');
  if (cachedData) {
    studentDataMap = JSON.parse(cachedData);
  } else {
    loadStudentData();
  }
}

/**
 * Searches for a student by either ID or name, based on the input.
 *
 * @param {string} input - The user input, which could be a student ID or name.
 * @returns {Object} Search results: either a single student (if ID is matched) or a list of students (if name is matched).
 */
function searchStudent(input) {
  getCachedStudentData();
  const trimmedInput = input.trim();
  
  if (/^\d+$/.test(trimmedInput)) {
    // Input is numeric, assume it's a student ID
    const studentInfo = studentDataMap[trimmedInput];
    if (studentInfo) {
      return {
        success: true,
        matches: [{
          studentId: trimmedInput,
          studentName: studentInfo.name,
          medAlertCode: studentInfo.medAlertCode,
          medAlertComment: studentInfo.medAlertComment
        }]
      };
    } else {
      return { success: false, message: 'Student ID not found' };
    }
  } else {
    // Input is not numeric, assume it's a name
    const matches = Object.entries(studentDataMap)
      .filter(([id, data]) => data.name.toLowerCase().includes(trimmedInput.toLowerCase()))
      .map(([id, data]) => ({
        studentId: id,
        studentName: data.name,
        medAlertCode: data.medAlertCode,
        medAlertComment: data.medAlertComment
      }));

    if (matches.length > 0) {
      return { success: true, matches: matches };
    } else {
      return { success: false, message: 'No students found with that name' };
    }
  }
}

/**
 * Creates a new sheet in the target spreadsheet with today's date as its name.
 * 
 * @returns {Sheet} The newly created sheet, or the existing one if already present.
 */
function createDailySheet() {
  const targetSheetId = '1UiCJWAnAAk0Ay7Oyvd9oUsUe7ZNMAOw211Ip2XBrsw0';
  const targetSpreadsheet = SpreadsheetApp.openById(targetSheetId);
  const today = new Date();
  const sheetName = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  // Check if the sheet already exists
  let sheet = targetSpreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    // Create a new sheet with the current date as its name
    sheet = targetSpreadsheet.insertSheet(sheetName);
    sheet.appendRow(['Timestamp', 'Student ID', 'Student Name', 'Med Alert Code', 'Med Alert Comment']);

    // Move the new sheet to the first position
    targetSpreadsheet.setActiveSheet(sheet);
    targetSpreadsheet.moveActiveSheet(0);
  }
  return sheet;
}

/**
 * Submits student data to a new row in the current daily sheet.
 * This function is called from Form.html from the submitStudent function found in the script tag
 * of the html body.
 * 
 * @param {string} studentId - The ID of the student.
 * @param {string} result - The result object containing the student's name.
 * @param {string} alertCode - The alertCode that currently exists in the student's record.
 * @param {string} alertComment - Details regarding the alertCode.
 * 
 * @returns {string} A success message to the user.
 */
function submitStudentData(studentId, result, alertCode, alertComment) {
  const sheet = createDailySheet();

  const now = new Date();
  const formattedDate = Utilities.formatDate(now, Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm:ss');

  sheet.appendRow([formattedDate, studentId, result, alertCode, alertComment]);
  return '🍔 Name added 🍔';
}

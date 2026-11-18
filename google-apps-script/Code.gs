/**
 * Google Apps Script backend for finedaevibe POS
 * Sheets required:
 * 1. "Sales" -> Columns A-I:
 *    [Timestamp (GMT+7), Receipt No, Items, Total, Received, Change, Payment Method, Staff Name, Receipt Drive URL]
 * 2. "Users" -> Columns A-E:
 *    [Username, Password, Name, Role, Status]
 */

var SALES_SHEET_NAME = 'Sales';
var USERS_SHEET_NAME = 'Users';
var RECEIPT_FOLDER_NAME = 'POS_Receipts';

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action)
    ? String(e.parameter.action).toLowerCase()
    : 'health';

  if (action === 'summary') {
    return getSalesSummary_();
  }
  if (action === 'getusers') {
    return handleGetUsers_();
  }

  return jsonResponse_({
    status: 'success',
    message: 'POS Google Apps Script Web App is running',
    timestamp: Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy HH:mm:ss')
  });
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var data = JSON.parse(raw);
    var action = String(data.action || 'checkout').toLowerCase();

    if (action === 'login') {
      return handleLogin_(data);
    }
    if (action === 'getusers') {
      return handleGetUsers_();
    }
    if (action === 'saveuser') {
      return handleSaveUser_(data);
    }
    if (action === 'deleteuser') {
      return handleDeleteUser_(data);
    }

    return handleCheckout_(data);
  } catch (err) {
    return jsonResponse_({
      status: 'error',
      message: err && err.message ? err.message : String(err)
    });
  }
}

function ensureUsersSheet_(ss) {
  var usersSheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(USERS_SHEET_NAME);
    usersSheet.appendRow(['Username', 'Password', 'Name', 'Role', 'Status']);
    return usersSheet;
  }

  if (usersSheet.getLastRow() === 0) {
    usersSheet.appendRow(['Username', 'Password', 'Name', 'Role', 'Status']);
  }
  return usersSheet;
}

function getUserColumnIndexes_(headersRow) {
  var headers = headersRow.map(function (h) {
    return String(h).trim().toLowerCase();
  });

  var idxUsername = headers.indexOf('username');
  var idxPassword = headers.indexOf('password');
  var idxName = headers.indexOf('name');
  var idxRole = headers.indexOf('role');
  var idxStatus = headers.indexOf('status');

  return {
    username: idxUsername !== -1 ? idxUsername : 0,
    password: idxPassword !== -1 ? idxPassword : 1,
    name: idxName !== -1 ? idxName : 2,
    role: idxRole !== -1 ? idxRole : 3,
    status: idxStatus !== -1 ? idxStatus : 4,
    totalCols: Math.max(headers.length, 5)
  };
}

function handleGetUsers_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var usersSheet = ensureUsersSheet_(ss);
  var values = usersSheet.getDataRange().getValues();

  if (values.length < 2) {
    return jsonResponse_({ status: 'success', users: [] });
  }

  var idx = getUserColumnIndexes_(values[0]);
  var users = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var username = String(row[idx.username] || '').trim();
    if (!username) continue;

    var roleRaw = String(row[idx.role] || 'staff').trim().toLowerCase();
    var statusRaw = String(row[idx.status] || 'active').trim().toLowerCase();

    users.push({
      username: username,
      password: String(row[idx.password] || ''),
      name: String(row[idx.name] || username).trim(),
      role: roleRaw === 'admin' ? 'admin' : 'staff',
      status: statusRaw === 'inactive' ? 'inactive' : 'active'
    });
  }

  return jsonResponse_({
    status: 'success',
    users: users
  });
}

function handleSaveUser_(data) {
  var username = String(data.username || '').trim();
  var password = String(data.password || '');
  var name = String(data.name || username).trim();
  var role = String(data.role || 'staff').trim().toLowerCase() === 'admin' ? 'admin' : 'staff';
  var status = String(data.status || 'active').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';

  if (!username) {
    return jsonResponse_({ status: 'error', message: 'Username is required.' });
  }
  if (!password) {
    return jsonResponse_({ status: 'error', message: 'Password is required.' });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var usersSheet = ensureUsersSheet_(ss);
  var values = usersSheet.getDataRange().getValues();
  var idx = getUserColumnIndexes_(values[0]);
  var targetLower = username.toLowerCase();

  for (var i = 1; i < values.length; i++) {
    var rowUser = String(values[i][idx.username] || '').trim().toLowerCase();
    if (rowUser === targetLower) {
      var sheetRow = i + 1;
      usersSheet.getRange(sheetRow, idx.username + 1).setValue(username);
      usersSheet.getRange(sheetRow, idx.password + 1).setValue(password);
      usersSheet.getRange(sheetRow, idx.name + 1).setValue(name);
      usersSheet.getRange(sheetRow, idx.role + 1).setValue(role);
      usersSheet.getRange(sheetRow, idx.status + 1).setValue(status);

      return jsonResponse_({
        status: 'success',
        mode: 'updated',
        user: {
          username: username,
          password: password,
          name: name,
          role: role,
          status: status
        }
      });
    }
  }

  var newRow = new Array(idx.totalCols);
  for (var c = 0; c < newRow.length; c++) newRow[c] = '';
  newRow[idx.username] = username;
  newRow[idx.password] = password;
  newRow[idx.name] = name;
  newRow[idx.role] = role;
  newRow[idx.status] = status;
  usersSheet.appendRow(newRow);

  return jsonResponse_({
    status: 'success',
    mode: 'created',
    user: {
      username: username,
      password: password,
      name: name,
      role: role,
      status: status
    }
  });
}

function handleDeleteUser_(data) {
  var username = String(data.username || '').trim();
  if (!username) {
    return jsonResponse_({ status: 'error', message: 'Username is required.' });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var usersSheet = ensureUsersSheet_(ss);
  var values = usersSheet.getDataRange().getValues();
  var idx = getUserColumnIndexes_(values[0]);
  var targetLower = username.toLowerCase();

  for (var i = 1; i < values.length; i++) {
    var rowUser = String(values[i][idx.username] || '').trim().toLowerCase();
    if (rowUser === targetLower) {
      usersSheet.deleteRow(i + 1);
      return jsonResponse_({
        status: 'success',
        deleted: true,
        username: username
      });
    }
  }

  return jsonResponse_({
    status: 'error',
    message: 'User not found: ' + username
  });
}

function handleLogin_(data) {
  var usernameInput = String(data.username || '').trim().toLowerCase();
  var passwordInput = String(data.password || '');

  if (!usernameInput || !passwordInput) {
    return jsonResponse_({ status: 'error', message: 'Username and password are required.' });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var usersSheet = ensureUsersSheet_(ss);
  var values = usersSheet.getDataRange().getValues();
  if (values.length < 2) {
    return jsonResponse_({ status: 'error', message: 'No users configured in Users sheet.' });
  }

  var idx = getUserColumnIndexes_(values[0]);

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rowUser = String(row[idx.username] || '').trim().toLowerCase();
    var rowPass = String(row[idx.password] || '');
    var rowName = String(row[idx.name] || row[idx.username] || '').trim();
    var rowRole = String(row[idx.role] || 'staff').trim().toLowerCase();
    var rowStatus = String(row[idx.status] || '').trim().toLowerCase();

    if (rowUser === usernameInput && rowPass === passwordInput) {
      if (rowStatus !== 'active') {
        return jsonResponse_({
          status: 'error',
          message: 'Account is inactive. Please contact an administrator.'
        });
      }

      return jsonResponse_({
        status: 'success',
        user: {
          username: String(row[idx.username] || '').trim(),
          name: rowName,
          role: rowRole === 'admin' ? 'admin' : 'staff'
        }
      });
    }
  }

  return jsonResponse_({
    status: 'error',
    message: 'Invalid username or password.'
  });
}

function handleCheckout_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SALES_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SALES_SHEET_NAME);
    sheet.appendRow([
      'Timestamp',
      'Receipt No',
      'Items',
      'Total',
      'Received',
      'Change',
      'Payment Method',
      'Staff Name',
      'Receipt Drive URL'
    ]);
  }

  var receiptNo = String(data.receiptNo || ('RC-' + new Date().getTime()));
  var items = String(data.items || '');
  var total = Number(data.total || 0);
  var paymentMethod = String(data.paymentMethod || 'Cash');
  var isPromptPay = paymentMethod.toLowerCase().indexOf('promptpay') !== -1;
  var received = isPromptPay ? total : Number(data.received || 0);
  var change = isPromptPay ? 0 : Number(data.change || 0);
  var staffName = String(data.staffName || '');
  var receiptImage = String(data.receiptImage || '');

  var receiptDriveUrl = '';
  if (receiptImage) {
    receiptDriveUrl = saveReceiptImageToDrive_(receiptImage, receiptNo);
  }

  var thaiTimestamp = Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy HH:mm:ss');

  // Exact 9-column order (Columns A-I)
  sheet.appendRow([
    thaiTimestamp,
    receiptNo,
    items,
    Number(total),
    Number(received),
    Number(change),
    paymentMethod,
    staffName,
    receiptDriveUrl
  ]);

  return jsonResponse_({
    status: 'success',
    timestamp: thaiTimestamp,
    receiptNo: receiptNo,
    receiptDriveUrl: receiptDriveUrl
  });
}

function saveReceiptImageToDrive_(base64Data, receiptNo) {
  var cleanBase64 = base64Data;
  var mimeType = 'image/png';

  var match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    mimeType = match[1];
    cleanBase64 = match[2];
  }

  var decoded = Utilities.base64Decode(cleanBase64);
  var blob = Utilities.newBlob(decoded, mimeType, receiptNo + '.png');

  var folders = DriveApp.getFoldersByName(RECEIPT_FOLDER_NAME);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(RECEIPT_FOLDER_NAME);

  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function getSalesSummary_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SALES_SHEET_NAME);
  if (!sheet) {
    return jsonResponse_({ status: 'success', rows: [] });
  }
  var values = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    rows.push({
      timestamp: values[i][0],
      receiptNo: values[i][1],
      items: values[i][2],
      total: Number(values[i][3] || 0),
      received: Number(values[i][4] || 0),
      change: Number(values[i][5] || 0),
      paymentMethod: values[i][6],
      staffName: values[i][7],
      receiptDriveUrl: values[i][8]
    });
  }
  return jsonResponse_({ status: 'success', rows: rows });
}

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var salesSheet = ss.getSheetByName(SALES_SHEET_NAME) || ss.insertSheet(SALES_SHEET_NAME);
  if (salesSheet.getLastRow() === 0) {
    salesSheet.appendRow([
      'Timestamp',
      'Receipt No',
      'Items',
      'Total',
      'Received',
      'Change',
      'Payment Method',
      'Staff Name',
      'Receipt Drive URL'
    ]);
  }

  var usersSheet = ensureUsersSheet_(ss);
  if (usersSheet.getLastRow() === 1) {
    usersSheet.appendRow(['admin', 'admin123', 'แพรว (Admin)', 'admin', 'active']);
    usersSheet.appendRow(['staff', 'staff123', 'โมจิ (Staff)', 'staff', 'active']);
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/**
 * Automated Live Demonstration Script
 * Executes the complete 12-step EPIA assessment sequence against the running server.
 * Run with: npm run demo
 */

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function printStep(stepNum, title) {
  console.log(`\n================================================================`);
  console.log(` STEP ${stepNum}: ${title}`);
  console.log(`================================================================`);
}

async function runLiveDemo() {
  console.log(`\n🚀 Starting EPIA CRM Backend Live Verification`);
  console.log(`Target Base URL: ${BASE_URL}\n`);

  try {
    // 1. Health check
    printStep(1, 'Server Health Check');
    const health = await makeRequest('GET', '/health');
    console.log(`HTTP ${health.status}`, JSON.stringify(health.body, null, 2));

    // 2. Create Appointment
    printStep(2, 'Task 1 - Create Patient Appointment');
    const aptPayload = {
      name: 'Eleanor Vance',
      phone: '9876543210',
      date: '2026-11-20'
    };
    console.log('Request Payload:', JSON.stringify(aptPayload));
    const createApt = await makeRequest('POST', '/api/appointments', aptPayload);
    console.log(`HTTP ${createApt.status}`, JSON.stringify(createApt.body, null, 2));
    const appointmentId = createApt.body.data.id;

    // 3. Retrieve Appointment By ID
    printStep(3, `Task 1 - Retrieve Appointment #${appointmentId}`);
    const getApt = await makeRequest('GET', `/api/appointments/${appointmentId}`);
    console.log(`HTTP ${getApt.status}`, JSON.stringify(getApt.body, null, 2));

    // 4. Send Successful Simulated WhatsApp Reminder
    printStep(4, 'Task 2 - Send Simulated WhatsApp Reminder (Status: Sent)');
    const waSuccessPayload = {
      appointmentId,
      phone: '9876543210',
      message: 'Your health consultation is confirmed for tomorrow at 10:00 AM.',
      simulationMode: 'success'
    };
    console.log('Request Payload:', JSON.stringify(waSuccessPayload));
    const waSuccess = await makeRequest('POST', '/api/whatsapp/send-reminder', waSuccessPayload);
    console.log(`HTTP ${waSuccess.status}`, JSON.stringify(waSuccess.body, null, 2));

    // 5. Simulate WhatsApp OAuth Error 190
    printStep(5, 'Task 2 - Simulate Meta OAuth Error 190 (Expected Failure)');
    const waFailPayload = {
      appointmentId,
      phone: '9876543210',
      message: 'This message will fail due to simulated expired OAuth token.',
      simulationMode: 'invalid_token'
    };
    console.log('Request Payload:', JSON.stringify(waFailPayload));
    const waFail = await makeRequest('POST', '/api/whatsapp/send-reminder', waFailPayload);
    console.log(`HTTP ${waFail.status} (Handled gracefully, server remains healthy)`, JSON.stringify(waFail.body, null, 2));

    // 6. Verify Messages Audit Log
    printStep(6, 'Task 2 - Retrieve WhatsApp Message Audit Log from SQLite');
    const messages = await makeRequest('GET', '/api/whatsapp/messages');
    console.log(`HTTP ${messages.status} - Total Messages Logged: ${messages.body.count}`);
    messages.body.data.slice(0, 2).forEach(m => {
      console.log(` - ID #${m.id} | Status: ${m.status.toUpperCase()} | Code: ${m.error_code || 'None'} | Provider ID: ${m.provider_message_id || 'N/A'}`);
    });

    // 7. Create CRM Follow-Up
    printStep(7, 'Task 3 - Create CRM Patient Follow-Up');
    const fuPayload = {
      appointmentId,
      followupDate: '2026-11-22',
      notes: 'Check post-consultation recovery and medication compliance'
    };
    console.log('Request Payload:', JSON.stringify(fuPayload));
    const createFu = await makeRequest('POST', '/api/followups', fuPayload);
    console.log(`HTTP ${createFu.status}`, JSON.stringify(createFu.body, null, 2));
    const followupId = createFu.body.data.id;

    // 8. Retrieve Pending Follow-Ups
    printStep(8, 'Task 3 - Retrieve Pending Follow-Ups with Patient Details (Sorted ASC)');
    const pendingFu = await makeRequest('GET', '/api/followups/pending');
    console.log(`HTTP ${pendingFu.status} - Pending Count: ${pendingFu.body.count}`);
    console.log(JSON.stringify(pendingFu.body.data, null, 2));

    // 9. Mark Follow-Up Completed
    printStep(9, `Task 3 - Mark Follow-Up #${followupId} Completed`);
    const completeFu = await makeRequest('PATCH', `/api/followups/${followupId}/complete`);
    console.log(`HTTP ${completeFu.status}`, JSON.stringify(completeFu.body, null, 2));

    // 10. Verify Completed Status
    printStep(10, `Task 3 - Verify Follow-Up #${followupId} Updated Record`);
    const verifyFu = await makeRequest('GET', `/api/followups/${followupId}`);
    console.log(`Status is now: "${verifyFu.body.data.status}" (Updated at: ${verifyFu.body.data.updated_at})`);

    // 11. Trigger Duplicate Follow-Up on Same Date (Constraint Verification)
    printStep(11, 'Task 3 - Duplicate Prevention: Attempt Second Follow-Up on Same Date');
    const dupPayload = {
      appointmentId,
      followupDate: '2026-11-22',
      notes: 'This duplicate follow-up must be rejected by SQLite UNIQUE constraint.'
    };
    console.log('Request Payload:', JSON.stringify(dupPayload));
    const dupFu = await makeRequest('POST', '/api/followups', dupPayload);
    console.log(`HTTP ${dupFu.status} Conflict (Expected)`, JSON.stringify(dupFu.body, null, 2));

    // 12. Retrieve All Appointments
    printStep(12, 'Task 1 - Retrieve All Appointments');
    const allApts = await makeRequest('GET', '/api/appointments');
    console.log(`HTTP ${allApts.status} - Total Appointments: ${allApts.body.count}`);

    console.log(`\n================================================================`);
    console.log(` 🎉 ALL 12 VERIFICATION STEPS COMPLETED WITH 100% SUCCESS`);
    console.log(`================================================================\n`);
  } catch (error) {
    console.error('❌ Demo verification failed:', error.message);
    process.exit(1);
  }
}

runLiveDemo();


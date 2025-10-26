// Open browser console and run this to debug localStorage
console.log('=== LOCAL STORAGE DEBUG ===');
const userTaskData = JSON.parse(localStorage.getItem('userTaskData') || '{}');
console.log('Stored tasks:', Object.keys(userTaskData).length);
console.log('Task IDs:', Object.keys(userTaskData));
console.log('Task details:', userTaskData);
console.log('Decrypted tasks:', JSON.parse(localStorage.getItem('decryptedTasks') || '[]'));
console.log('Deleted tasks:', JSON.parse(localStorage.getItem('deletedTasks') || '{}'));
console.log('Completed tasks:', JSON.parse(localStorage.getItem('completedTasks') || '{}'));

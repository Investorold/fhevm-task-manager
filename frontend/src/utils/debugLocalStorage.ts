// Debug utility to inspect localStorage data

export const debugLocalStorage = () => {
  const userTaskData = JSON.parse(localStorage.getItem('userTaskData') || '{}');
  const decryptedTasks = JSON.parse(localStorage.getItem('decryptedTasks') || '[]');
  const deletedTasks = JSON.parse(localStorage.getItem('deletedTasks') || '{}');
  const completedTasks = JSON.parse(localStorage.getItem('completedTasks') || '{}');

  console.log('📂 localStorage Debug Info:');
  console.log('='.repeat(50));
  
  console.log('🔍 userTaskData keys:', Object.keys(userTaskData));
  console.log('📊 userTaskData content:', userTaskData);
  
  console.log('\n🔓 decryptedTasks:', decryptedTasks);
  
  console.log('\n🗑️ deletedTasks:', Object.keys(deletedTasks));
  
  console.log('\n✅ completedTasks:', Object.keys(completedTasks));
  
  console.log('\n📝 Sample task data (first key):');
  if (Object.keys(userTaskData).length > 0) {
    const firstKey = Object.keys(userTaskData)[0];
    console.log(`Key: ${firstKey}`);
    console.log('Data:', userTaskData[firstKey]);
  }
  
  console.log('='.repeat(50));
};

// Run on import if in development
if (typeof window !== 'undefined' && window.location.href.includes('localhost')) {
  window.debugLocalStorage = debugLocalStorage;
}


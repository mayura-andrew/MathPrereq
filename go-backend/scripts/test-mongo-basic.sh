#!/bin/bash

echo "🔧 Simple MongoDB Connection Test"

# Test MongoDB connection directly
echo "Testing MongoDB connection..."
mongosh "mongodb://admin:password123@localhost:27017/mathprereq?authSource=admin" --quiet --eval "
print('✅ MongoDB Connection Test:');
print('Database:', db.getName());
print('Auth working:', db.runCommand({ping: 1}).ok === 1);

// Test collection access
try {
  const collections = db.getCollectionNames();
  print('Collections accessible:', collections.length > 0 ? 'Yes' : 'No');
  print('Available collections:', collections);
  
  // Test write permission specifically
  const testResult = db.educational_resources.insertOne({
    test: true,
    created_at: new Date(),
    auth_test: 'write_permission_check'
  });
  
  print('✅ Write permission test: SUCCESS');
  print('Inserted document ID:', testResult.insertedId);
  
  // Clean up
  db.educational_resources.deleteOne({_id: testResult.insertedId});
  print('✅ Cleanup successful');
  
} catch (error) {
  print('❌ Database operation failed:', error.message);
}
"

echo ""
echo "If you see any authentication errors above, the MongoDB setup needs fixing."
echo "If all operations succeed, the issue is in the Go application code."
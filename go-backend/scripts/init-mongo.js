// MongoDB initialization script
// This runs when the container starts for the first time

print('🚀 Starting MongoDB initialization for mathprereq...');

// Switch to mathprereq database
var db = db.getSiblingDB('mathprereq');

print('📚 Creating mathprereq database and collections...');

// Create educational_resources collection
db.createCollection('educational_resources');

// Create indexes for efficient queries
print('📑 Creating database indexes...');
db.educational_resources.createIndex({ "concept_id": 1 });
db.educational_resources.createIndex({ "url": 1 }, { unique: true });
db.educational_resources.createIndex({ "quality_score": -1 });
db.educational_resources.createIndex({ "scraped_at": -1 });
db.educational_resources.createIndex({ 
    "concept_id": 1, 
    "quality_score": -1 
});
db.educational_resources.createIndex({ "source_domain": 1 });
db.educational_resources.createIndex({ "resource_type": 1 });
db.educational_resources.createIndex({ "difficulty_level": 1 });

print('✅ MongoDB initialization completed!');
print('📊 Database: mathprereq');
print('📋 Collection: educational_resources');
print('🔍 Indexes created: 8 indexes for efficient querying');

// Insert a test document to verify everything works
var testResult = db.educational_resources.insertOne({
    concept_id: "test_initialization", 
    concept_name: "Test Concept",
    title: "MongoDB Initialization Test",
    url: "http://test.example.com/init", 
    description: "Test document created during MongoDB initialization",
    resource_type: "test",
    source_domain: "test.example.com",
    difficulty_level: "beginner",
    quality_score: 1.0,
    scraped_at: new Date(),
    language: "en",
    tags: ["test", "initialization"],
    is_verified: true
});

if (testResult.acknowledged) {
    print('✅ Test document inserted successfully!');
    
    // Clean up test document
    db.educational_resources.deleteOne({_id: testResult.insertedId});
    print('🧹 Test document cleaned up');
} else {
    print('❌ Test document insertion failed');
}

print('🎉 mathprereq MongoDB setup complete!');
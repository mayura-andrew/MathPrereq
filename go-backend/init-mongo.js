// MongoDB initialization script for MathPrereq application
print("🚀 Initializing MathPrereq MongoDB database...");

// Switch to the mathprereq database
db = db.getSiblingDB('mathprereq');

// Create application user for the mathprereq database
try {
    db.createUser({
        user: "mathprereq_app",
        pwd: "app_password123",
        roles: [
            { role: "readWrite", db: "mathprereq" }
        ]
    });
    print("✅ Application user 'mathprereq_app' created successfully");
} catch (err) {
    if (err.code === 11000) {
        print("ℹ️  Application user 'mathprereq_app' already exists");
    } else {
        print("❌ Error creating application user: " + err.message);
    }
}

// Create collections with proper structure
db.createCollection('query_responses');
db.createCollection('user_sessions');
db.createCollection('analytics');
db.createCollection('concept_feedback');

print("📊 Created collections: query_responses, user_sessions, analytics, concept_feedback");

// Create indexes for query_responses collection (performance optimization)
db.query_responses.createIndex({ "timestamp": -1 });
db.query_responses.createIndex({ "user_id": 1, "timestamp": -1 });
db.query_responses.createIndex({ "query": "text" });
db.query_responses.createIndex({ "identified_concepts": 1 });
db.query_responses.createIndex({ "processing_success": 1, "timestamp": -1 });
db.query_responses.createIndex({ "llm_provider": 1 });
db.query_responses.createIndex({ "response_time": 1 });

print("🔍 Created performance indexes for query_responses collection");

// Create indexes for user_sessions collection
db.user_sessions.createIndex({ "session_id": 1 }, { unique: true });
db.user_sessions.createIndex({ "user_id": 1 });
db.user_sessions.createIndex({ "created_at": -1 });

print("🔍 Created indexes for user_sessions collection");

// Insert sample data for testing
try {
    db.query_responses.insertOne({
        user_id: "test_user_001",
        query: "What is the derivative of x^2?",
        identified_concepts: ["derivatives", "power rule"],
        prerequisite_path: [
            { id: "functions", name: "Functions", description: "Basic function concepts" },
            { id: "limits", name: "Limits", description: "Limit fundamentals" },
            { id: "derivatives", name: "Derivatives", description: "Derivative basics" }
        ],
        retrieved_context: ["The power rule states that d/dx[x^n] = n*x^(n-1)"],
        explanation: "To find the derivative of x^2, we use the power rule...",
        response_time: 2500,
        processing_success: true,
        timestamp: new Date(),
        llm_provider: "gemini",
        llm_model: "gemini-2.0-flash-exp",
        knowledge_graph_hits: 3,
        vector_store_hits: 1
    });
    
    print("✅ Sample query response inserted for testing");
} catch (err) {
    print("❌ Error inserting sample data: " + err.message);
}

// Create a test user session
try {
    db.user_sessions.insertOne({
        session_id: "test_session_001",
        user_id: "test_user_001",
        ip_address: "127.0.0.1",
        user_agent: "MathPrereq Test Client",
        created_at: new Date(),
        last_active: new Date(),
        is_active: true
    });
    
    print("✅ Sample user session created for testing");
} catch (err) {
    print("❌ Error creating sample session: " + err.message);
}

print("🎉 MongoDB initialization completed successfully for MathPrereq!");
print("📋 Ready to accept query analytics and user data");
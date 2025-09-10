// Smart Concept Query Component for React
import React, { useState } from 'react';

const SmartConceptQuery = () => {
    const [conceptName, setConceptName] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const queryConceptSmart = async () => {
        if (!conceptName.trim()) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/v1/concept-query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Request-ID': `req-${Date.now()}`
                },
                body: JSON.stringify({
                    concept_name: conceptName.trim(),
                    user_id: 'web_user_123' // Optional
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setResult(data);
            
            console.log(`Query processed from ${data.source} in ${data.processing_time}`);
            
        } catch (err) {
            console.error('Smart concept query failed:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-6">Smart Concept Learning</h2>
            
            {/* Search Input */}
            <div className="mb-6">
                <div className="flex gap-4">
                    <input
                        type="text"
                        value={conceptName}
                        onChange={(e) => setConceptName(e.target.value)}
                        placeholder="Enter a math concept (e.g., limits, derivatives)"
                        className="flex-1 p-3 border rounded-lg"
                        onKeyPress={(e) => e.key === 'Enter' && queryConceptSmart()}
                    />
                    <button
                        onClick={queryConceptSmart}
                        disabled={loading || !conceptName.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : 'Learn Concept'}
                    </button>
                </div>
            </div>

            {/* Quick Concept Buttons */}
            <div className="mb-6">
                <p className="text-sm text-gray-600 mb-3">Quick concepts:</p>
                <div className="flex flex-wrap gap-2">
                    {['limits', 'derivatives', 'integrals', 'chain rule', 'linear algebra'].map(concept => (
                        <button
                            key={concept}
                            onClick={() => {
                                setConceptName(concept);
                                queryConceptSmart();
                            }}
                            className="bg-gray-100 hover:bg-blue-100 text-gray-700 px-3 py-1 rounded text-sm"
                        >
                            {concept}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Processing your concept query...</p>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-700">Error: {error}</p>
                </div>
            )}

            {/* Results */}
            {result && !loading && (
                <div className="space-y-6">
                    {/* Header with Cache Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">
                                Learning: {result.concept_name}
                            </h3>
                            <div className="flex items-center gap-4 text-sm">
                                <span className={`px-2 py-1 rounded ${
                                    result.source === 'cache' 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {result.source === 'cache' ? '⚡ From Cache' : '🔄 Fresh Processing'}
                                </span>
                                <span className="text-gray-600">
                                    {result.processing_time}
                                </span>
                                {result.cache_age && (
                                    <span className="text-gray-500 text-xs">
                                        Cached {Math.round(result.cache_age / (1000 * 60 * 60))}h ago
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Learning Path */}
                    {result.learning_path && result.learning_path.concepts.length > 0 && (
                        <div className="bg-white border rounded-lg p-6">
                            <h4 className="font-semibold mb-4">📚 Learning Path</h4>
                            <div className="space-y-3">
                                {result.learning_path.concepts.map((concept, index) => (
                                    <div key={concept.id} className="flex items-start gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                            concept.type === 'target' 
                                                ? 'bg-blue-100 text-blue-700' 
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium">{concept.name}</p>
                                            <p className="text-sm text-gray-600">{concept.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Explanation */}
                    <div className="bg-white border rounded-lg p-6">
                        <h4 className="font-semibold mb-4">💡 Detailed Explanation</h4>
                        <div className="prose max-w-none">
                            <div dangerouslySetInnerHTML={{ 
                                __html: result.explanation.replace(/\n/g, '<br>') 
                            }} />
                        </div>
                    </div>

                    {/* Educational Resources */}
                    {result.educational_resources && result.educational_resources.length > 0 && (
                        <div className="bg-white border rounded-lg p-6">
                            <h4 className="font-semibold mb-4">🎓 Learning Resources</h4>
                            <div className="space-y-4">
                                {result.educational_resources.map((resource, index) => (
                                    <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                        <h5 className="font-medium text-blue-600 mb-2">
                                            <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                                {resource.title}
                                            </a>
                                        </h5>
                                        <p className="text-gray-600 text-sm mb-3">{resource.description}</p>
                                        <div className="flex gap-2">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                                {resource.resource_type}
                                            </span>
                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                                {Math.round(resource.quality_score * 100)}% Quality
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {result.resources_message && (
                                <p className="text-sm text-gray-500 mt-4">{result.resources_message}</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SmartConceptQuery;
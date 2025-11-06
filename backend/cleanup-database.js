const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/movietier';

console.log('🗑️  MovieTier Database Cleanup Script');
console.log('=====================================');
console.log(`Connecting to: ${mongoUri}\n`);

async function cleanupDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections:\n`);

    let totalDeleted = 0;

    // Delete all documents from each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);

      // Count documents before deletion
      const count = await collection.countDocuments();

      if (count > 0) {
        // Delete all documents
        const result = await collection.deleteMany({});
        console.log(`  📦 ${collectionName}: Deleted ${result.deletedCount} documents`);
        totalDeleted += result.deletedCount;
      } else {
        console.log(`  📦 ${collectionName}: Already empty`);
      }
    }

    console.log(`\n✅ Cleanup completed!`);
    console.log(`   Total documents deleted: ${totalDeleted}`);
    console.log(`   Collections preserved: ${collections.length}\n`);

    // Verify collections still exist
    const collectionsAfter = await db.listCollections().toArray();
    console.log('✅ All collections are still intact:');
    collectionsAfter.forEach(col => {
      console.log(`   - ${col.name}`);
    });

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  }
}

// Run the cleanup
cleanupDatabase();

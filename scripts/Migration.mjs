async function migration() {
    let source, target;
    try {
        const sourceDB = process.env.MONGODB_URI; // TF DB

        const targetDB = process.env.MONGODB_URI; // Client DB

        // Use .asPromise() to ensure the connection is fully open before accessing .db
        source = await mongoose.createConnection(sourceDB).asPromise();
        target = await mongoose.createConnection(targetDB).asPromise();

        // Access the native MongoDB collection using .db
        const collection1 = source.db.collection("editingplans");
        const collection2 = source.db.collection("teamshootplans");

        const data1 = await collection1.find().toArray();
        const data2 = await collection2.find().toArray();

        if (data1 && data1.length > 0) {
            await target.db.collection("editingplans").insertMany(data1);
        }
        if (data2 && data2.length > 0) {
            await target.db.collection("teamshootplans").insertMany(data2);
        }

        res.status(200).json({
            message: "✅ Migration Completed"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "❌ Migration Failed",
            error: error.message || error
        });
    } finally {
        if (source) await source.close();
        if (target) await target.close();
    }
}

migration();
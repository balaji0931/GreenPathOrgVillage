export default async function globalTeardown() {
    // Close any remaining connections
    console.log('\n🔄 Test teardown: cleaning up...');
    console.log('✅ Test suite complete.');
}

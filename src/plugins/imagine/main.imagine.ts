import { Imagine } from "../../config/db.config";
import { IS_ENV } from "../../globals";
import { GeneralLogger } from "../../logger";
import { DatabaseService } from "../../services/db.service";
import { ImaginePlugin } from "./imagine_processor";

if (!IS_ENV.production) {
    const testDatabase = new DatabaseService({
        schema: Imagine,
        collectionName: "webflow-images"
    });

    testDatabase.initializeDatabase({
        dbName: "ImagineTestDB",
        uri: process.env.MONGODB_DOMAIN,
        retryLimit: 3
    });

    const testImages = new ImaginePlugin({ processingQuality: 30 });

    const directories = testImages.categories;

    const processedImages = await testImages.processor(directories);
    const failedImages = await testImages.exportImages(processedImages.imageArray);

    testImages.logger.info('Image processing has been completed!');

    if (failedImages.length !== 0) {
        testImages.logger.error(`These images failed to be processed`, failedImages.map(image => image.metadata));
    }

    testDatabase.disconnect();
} else {
    GeneralLogger.error(`Cannot run plugin main during production`);
    process.exit(1);
}
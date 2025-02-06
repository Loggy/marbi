import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';

import { config } from "dotenv";
config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Arbi Engine API')
    .setDescription('API documentation for Arbi Engine operations')
    .setVersion('1.0')
    .addTag('settings', 'Settings management endpoint: balances, initialize')
    .addTag('dd', 'Dex-Dex strategy endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Write the OpenAPI/Swagger JSON to a file
  fs.writeFileSync("./swagger-spec.json", JSON.stringify(document, null, 2));

  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import {registerLicense} from '@syncfusion/ej2-base';
registerLicense('Mgo2Mjg3NjQwMDkyZTM0MmUzME1hVjJmV2l6bXl5aG9nK1l3c1ZtRjJpT3hOaG9sYjNqL2xkK0l5c3l4dXo1c2h5aG9nK1l3c1ZtRjJpT3hOaG9sYjNqL2xkK0l5c3l4dXo1c2h5aG9nK1l3c1ZtRjJpT3hOaG9sYjNqL2xkK0l5c3l4dXo1c2h5aG9nK1l3c1ZtRjJpT3hOaG9sYjNqL2xkK0l5c3l4dXo1c2h5aG9nK1l3c1ZtRjJpT3hOaG9sYjNqL2xkK0l5c3l4dXo1c2h5aG9nK1l3c1ZtRjJpT3hOaG9sYjNqL2xkK0l5c3l4dXo1c2h5aG9nK1l3c1ZtRjJpT3hOaG9sYjNqL2xkK0l5c3l4dXo1c2h5aG9nK1l3c1ZtRjJpT3hOaG9sYjNqL2xkK0l5c3l4dXo1c2h5aG9nK1l3c1ZtRjJpT3hOaG9sYjNqL2xkK0l5c3l4dXo1c2h5aG9nK1l3c1ZtRjJpT3hOaG9sYjNqL2xkK')

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

import { addLookCourses } from '../src/content/chapters';
import * as look from '../src/content/chapters/look';

// The look-development courses are a chunk the page fetches only for `?dev&course=look-…` (src/content/chapters).
// Every unit test sees them in COURSES, as before they were split off.
addLookCourses(look);

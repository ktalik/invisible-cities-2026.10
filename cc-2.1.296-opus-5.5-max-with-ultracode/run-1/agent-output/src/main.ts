import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import './ui/styles.css';

const params = new URLSearchParams(location.search);
const shot = params.get('shot');

if (shot) {
  import('./shot').then((m) => m.runShot(shot, params));
} else {
  import('./app/app').then((m) => m.startApp());
}

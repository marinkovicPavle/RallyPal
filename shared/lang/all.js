// Every language, for the phone page, the side service and the tests (the watch reads only its own from its
// assets, see shared/i18n.js)
import { registerLang, setLang } from '../i18n'
import en from './en'
import sr from './sr'
import es from './es'
import it from './it'
import de from './de'
import fr from './fr'
import pt from './pt'

const ALL = { en, sr, es, it, de, fr, pt }
Object.keys(ALL).forEach((c) => registerLang(c, ALL[c]))
setLang('en')

export default ALL

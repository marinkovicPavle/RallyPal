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
import nl from './nl'
import pl from './pl'
import cs from './cs'
import uk from './uk'
import ru from './ru'
import sv from './sv'
import nb from './nb'
import da from './da'
import fi from './fi'
import ja from './ja'

const ALL = { en, sr, es, it, de, fr, pt, nl, pl, cs, uk, ru, sv, nb, da, fi, ja }
Object.keys(ALL).forEach((c) => registerLang(c, ALL[c]))
setLang('en')

export default ALL

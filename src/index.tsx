import { BigNumber } from 'bignumber.js'
import ReactDOM from 'react-dom'
import Root from 'src/components/Root'
import { disableMMAutoRefreshWarning } from './utils/mm_warnings'

disableMMAutoRefreshWarning()

BigNumber.set({ EXPONENTIAL_AT: [-7, 255] })

const root = document.getElementById('root')

if (root !== null) {
  ReactDOM.render(<Root />, root)
}

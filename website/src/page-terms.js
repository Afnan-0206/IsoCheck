/// page-terms.js - Terms and Conditions page.

import { renderLayout } from './layout.js';

export function renderTerms() {
  renderLayout(`
    <div class="container">
      <div class="legal-page">
        <h1>Terms and Conditions</h1>
        <p class="legal-date">Last updated: October 2026</p>

        <h2>License</h2>
        <p>
          IsoCheck is distributed under the MIT License. You are free to use, copy, modify,
          merge, publish, distribute, sublicense, and/or sell copies of the software, subject
          to the conditions of the MIT License.
        </p>

        <h2>No Warranty</h2>
        <p>
          THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
          INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
          PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
          HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
          OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
          SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
        </p>

        <h2>Intended Use</h2>
        <p>
          IsoCheck is a research and testing tool. It is designed to detect isolation anomalies
          in transaction histories for educational and diagnostic purposes. It is not a
          certification tool and should not be used as the sole basis for production deployment
          decisions.
        </p>

        <h2>Accuracy</h2>
        <p>
          IsoCheck's analysis is sound relative to its input: if it reports an anomaly, the
          anomaly is present in the observed history (no false positives for correctly recorded
          histories). However, the absence of detected anomalies does not prove a database is
          free of isolation bugs. The checker can only analyze the specific histories provided
          to it.
        </p>

        <h2>Your Data</h2>
        <p>
          All processing in the browser-based playground happens locally via WebAssembly.
          We do not store, transmit, or have access to the transaction histories you check.
          See the <a href="#/privacy">Privacy Policy</a> for details.
        </p>

        <h2>Changes</h2>
        <p>
          These terms may be updated. Changes will be posted on this page with an updated date.
        </p>
      </div>
    </div>
  `);
}

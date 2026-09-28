/**
 * Terms of Service — public, static, no auth required.
 *
 * DEVELOPER / LEGAL TODO before this ships to production. The copy below is a
 * product-specific DRAFT and is intentionally written in conservative,
 * non-committal language until each of these is confirmed:
 *  - Legal entity / registered company name operating TruMarkZ
 *  - Legal / privacy contact email (currently defaults to support@trumarkz.com
 *    via VITE_LEGAL_CONTACT_EMAIL — confirm this is the intended address)
 *  - Governing law / jurisdiction for disputes — do not assume India or any
 *    specific state. The "Governing Law and Dispute Resolution" clause has
 *    been OMITTED from the user-visible page below (rather than shown as a
 *    "[TBD]" placeholder) until this is confirmed; add it back as a proper
 *    numbered section once the jurisdiction is known.
 *  - Policy for setting/reviewing the "Last updated" date (currently a single
 *    constant in src/data/legalConfig.js)
 *  - Any contractual liability cap (none is stated below — left to counsel)
 *  - Confirmed fee, billing, and refund terms, if these need to be stated here
 *    rather than in a separate pricing/billing agreement
 *
 * This file must not be treated as legally reviewed or compliant until
 * product/legal ownership signs off on the above.
 */
import React from 'react';
import { LegalPageLayout, LegalSection } from '@/components/legal/LegalPageLayout';
import { LAST_UPDATED, LEGAL_CONTACT_EMAIL } from '@/data/legalConfig';

export const TermsOfService = () => {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <p>
        These Terms of Service ("Terms") govern your access to and use of TruMarkZ ("TruMarkZ", "we", "us",
        or "our"). By creating an account, signing in, or otherwise accessing TruMarkZ, you agree to these
        Terms and acknowledge our Privacy Policy.
      </p>

      <LegalSection id="description-of-service" title="1. Description of the Service">
        <p>TruMarkZ is a platform that supports identity and product verification workflows, including Human,
        Product, and Warranty verification; manual and third-party verification with assigned verifiers;
        issuance of digital credentials, including SDCs; QR-based and report-link verification; and related
        organization, individual, and account functionality.</p>
      </LegalSection>

      <LegalSection id="eligibility-and-authority" title="2. Eligibility and Authority">
        <p>You must have the legal capacity and authority to use the Service. If you register or act on behalf
        of an organization, you represent that you are authorized to act for that organization and to bind it
        to these Terms.</p>
      </LegalSection>

      <LegalSection id="account-responsibilities" title="3. Account Responsibilities">
        <p>You agree to:</p>
        <ul>
          <li>Provide accurate information when creating and maintaining your account</li>
          <li>Keep your login credentials secure</li>
          <li>Protect one-time passwords (OTPs) and any tokenized verification links from unauthorized access
          or sharing</li>
          <li>Notify us promptly of any suspected unauthorized use of your account</li>
        </ul>
        <p>We may suspend or restrict an account for security or misuse reasons, consistent with applicable
        law and any separate agreement in place.</p>
      </LegalSection>

      <LegalSection id="submitting-data-for-verification" title="4. Submitting Data for Verification">
        <p>If you or your organization submit personal information or documents relating to another person for
        verification, you represent that you have the authority or lawful basis required to do so. You must
        not upload unlawfully obtained data, fraudulent or forged material, malware, or content unrelated to
        or prohibited from the verification process. You remain responsible for the accuracy and legality of
        the data you submit.</p>
      </LegalSection>

      <LegalSection id="verification-results" title="5. Verification Results">
        <p>TruMarkZ facilitates verification processes; it does not itself vouch for facts beyond what a
        verification result reflects. A verification result reflects the information, check, or report
        available for that specific verification type at the relevant time. A "verified" or "approved" result
        does not guarantee a person's future conduct, a product's performance or authenticity beyond the scope
        of the check performed, legal compliance, fitness, creditworthiness, employment suitability, or any
        other attribute not directly covered by that check. Rejected or pending results should be interpreted
        only in the context of the specific check and any reason given.</p>
      </LegalSection>

      <LegalSection id="third-party-manual-verifiers" title="6. Third-Party and Manual Verifiers">
        <p>Where you act as an assigned verifier:</p>
        <ul>
          <li>You may access only the records assigned to your specific verification request.</li>
          <li>You must not share your verifier link with anyone else.</li>
          <li>You must evaluate assigned records in good faith and base your decision on legitimate
          evidence.</li>
          <li>You must not misuse any personal data you access through the verification process.</li>
          <li>Approvals and rejections you submit are attributed to the verification task you were assigned,
          and — where our systems designate you as the decision-maker for that verification type — are
          treated as the operative decision for that record.</li>
        </ul>
      </LegalSection>

      <LegalSection id="digital-credentials-sdcs" title="7. Digital Credentials, SDCs, and External Credential Systems">
        <p>Verification outcomes may be used to issue digital credentials, including SDCs, which may rely on
        third-party credential or distributed-ledger systems. Public identifiers or proofs associated with a
        credential may persist on those external systems. Where an external system does not support deletion
        or alteration of an already-issued credential, TruMarkZ cannot guarantee that the credential can be
        deleted or changed. You must not tamper with, forge, or misrepresent a credential issued through the
        Service.</p>
      </LegalSection>

      <LegalSection id="product-warranty-verification" title="8. Product and Warranty Verification">
        <p>Where Product or Warranty verification functions are used, the submitter is responsible for the
        accuracy of the product, serial number, warranty, and supporting-document information provided. A
        TruMarkZ verification or credential is limited to the scope of the checks actually performed and does
        not replace a manufacturer's warranty, statutory consumer rights, product safety approvals, or any
        other legal requirement, unless expressly stated otherwise.</p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="9. Acceptable Use">
        <p>You must not:</p>
        <ul>
          <li>Attempt fraudulent verification</li>
          <li>Impersonate another person or entity</li>
          <li>Submit forged or falsified documents</li>
          <li>Attempt unauthorized access to any part of the Service</li>
          <li>Scrape, abuse, or place excessive load on the Service</li>
          <li>Introduce malware or malicious code</li>
          <li>Interfere with or disrupt the Service</li>
          <li>Attempt to bypass authentication or security controls</li>
          <li>Misuse personal information accessed through the Service</li>
          <li>Misrepresent or misuse an issued credential</li>
          <li>Share a one-time verification link with anyone not authorized to use it</li>
        </ul>
      </LegalSection>

      <LegalSection id="fees-and-payments" title="10. Fees and Payments">
        <p>Certain services may be subject to fees shown or agreed before purchase or use. Where fees, refunds,
        taxes, or billing terms are governed by a separate agreement or order, that agreement controls. We do
        not state specific pricing in these Terms.</p>
      </LegalSection>

      <LegalSection id="intellectual-property" title="11. Intellectual Property">
        <p>The TruMarkZ platform, software, and branding remain the property of TruMarkZ and its licensors. You
        retain ownership of data you lawfully provide, subject to the license you grant us to host, process,
        and display that material as needed to provide the verification and credential services you request.</p>
      </LegalSection>

      <LegalSection id="third-party-services" title="12. Third-Party Services">
        <p>The Service relies on third-party services, including Google authentication, credential
        infrastructure, hosting and storage, and email delivery. We are not responsible for third-party
        services beyond what applicable law requires.</p>
      </LegalSection>

      <LegalSection id="suspension-and-termination" title="13. Suspension and Termination">
        <p>We may suspend or restrict access to the Service for violations of these Terms, fraud, security
        threats, unlawful use, non-payment where applicable, or as required by law. We will act reasonably and
        will not suspend or terminate access arbitrarily.</p>
      </LegalSection>

      <LegalSection id="disclaimers" title="14. Disclaimers">
        <p>The Service may occasionally be unavailable or subject to errors. Verification depends on the
        information submitted, external sources, and third parties, and we cannot guarantee that every result
        is complete or error-free. To the maximum extent permitted by applicable law, we disclaim warranties
        that are not expressly stated in these Terms. Nothing in this section limits a warranty or right that
        cannot lawfully be disclaimed.</p>
      </LegalSection>

      <LegalSection id="limitation-of-liability" title="15. Limitation of Liability">
        <p>To the maximum extent permitted by applicable law, TruMarkZ's liability arising from your use of the
        Service is limited as set out in any applicable agreement between you and TruMarkZ.</p>
      </LegalSection>

      <LegalSection id="indemnity" title="16. Indemnity">
        <p>To the maximum extent permitted by applicable law, you agree to indemnify TruMarkZ against claims
        arising from your misuse of the Service, unlawful submissions, violation of another person's rights,
        or fraud connected with your use of the Service.</p>
      </LegalSection>

      <LegalSection id="changes-to-service-terms" title="17. Changes to the Service and These Terms">
        <p>We may update the Service or these Terms from time to time. We will update the "Last updated" date
        above when we change these Terms. Continued use of the Service after a change means you accept the
        revised Terms.</p>
      </LegalSection>

      <LegalSection id="contact" title="18. Contact">
        <p>
          If you have questions about these Terms, contact us at{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
};

export default TermsOfService;

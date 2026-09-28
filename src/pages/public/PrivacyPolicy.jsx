/**
 * Privacy Policy — public, static, no auth required.
 *
 * DEVELOPER / LEGAL TODO before this ships to production. The copy below is a
 * product-specific DRAFT and is intentionally written in conservative,
 * non-committal language until each of these is confirmed:
 *  - Legal entity / registered company name operating TruMarkZ
 *  - Registered / business address, if legally required to be disclosed
 *  - Legal / privacy contact email (currently defaults to support@trumarkz.com
 *    via VITE_LEGAL_CONTACT_EMAIL — confirm this is the intended address)
 *  - Governing law / jurisdiction for disputes
 *  - Policy for setting/reviewing the "Last updated" date (currently a single
 *    constant in src/data/legalConfig.js)
 *  - Any verified certifications or compliance claims (none are made below —
 *    do not add ISO/GDPR/DPDP claims without documented proof)
 *  - Specific data retention periods, if the business/contract requires them
 *  - Whether the backend hashes stored passwords (unverified in this repo —
 *    the "Account authentication information" bullet below is deliberately
 *    neutral instead of claiming a specific hashing/storage implementation;
 *    only make that claim once the backend implementation is confirmed)
 *
 * This file must not be treated as legally reviewed or compliant until
 * product/legal ownership signs off on the above.
 */
import React from 'react';
import { LegalPageLayout, LegalSection } from '@/components/legal/LegalPageLayout';
import { LAST_UPDATED, LEGAL_CONTACT_EMAIL } from '@/data/legalConfig';

export const PrivacyPolicy = () => {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <p>
        This Privacy Policy describes how TruMarkZ ("TruMarkZ", "we", "us", or "our") handles information
        in connection with our identity, product, and warranty verification services, digital credential
        issuance, verifier upload links, QR-based report viewing, and related organization, individual, and
        account functionality (together, the "Service").
      </p>
      <LegalSection id="information-we-collect" title="1. Information We Collect">
        <p>What we collect depends on how you use the Service — as an organization, an individual account
        holder, a person whose information is submitted for verification, or an assigned verifier.</p>

        <h3>A. Account and contact information</h3>
        <ul>
          <li>Name</li>
          <li>Email address</li>
          <li>Phone number</li>
          <li>Account authentication information</li>
          <li>Account or user type (organization, individual, or administrator)</li>
        </ul>

        <h3>B. Organization information</h3>
        <p>Where you register or operate an organization account, this may include:</p>
        <ul>
          <li>Organization name and official contact information</li>
          <li>Business or registration information you provide</li>
          <li>GST or similar tax/registration details, where the Service requests them</li>
          <li>Address information</li>
          <li>Selected service type, industry, and verification configuration</li>
        </ul>

        <h3>C. Verification-subject information</h3>
        <p>Depending on the verification requested, information relating to the person or record being
        verified may include:</p>
        <ul>
          <li>Full name, email address, and phone number</li>
          <li>Date of birth</li>
          <li>Aadhaar number or PAN number, where the specific verification type requires it</li>
          <li>Address information</li>
          <li>Identity or supporting document data, and photos</li>
          <li>Verification attributes, status, and outcomes</li>
        </ul>
        <p>Not every verification collects every field above — only the fields relevant to the specific
        verification type requested are collected.</p>

        <h3>D. Product and warranty information</h3>
        <p>Where Product or Warranty verification is used, this may include product name and details, serial
        numbers, warranty-related information, uploaded product or warranty documents, and verification
        results.</p>

        <h3>E. Uploaded documents and reports</h3>
        <p>Users, organizations, and assigned verifiers may upload identity or supporting documents, images,
        verification reports, warranty or product documents, and spreadsheet or batch-upload files used to
        submit records for verification.</p>

        <h3>F. Verifier information</h3>
        <p>For manual or third-party verification, we process the verifier's name and email where available,
        the verification type and records assigned to them, any report they submit, their verification
        decision or status, and any rejection reason they supply.</p>

        <h3>G. Authentication and technical information</h3>
        <p>We process authentication and session identifiers needed to keep you signed in and your account
        secure, and, where you choose to sign in with Google, the account information Google provides for
        that purpose. We may also rely on service or security logs, or basic device/network metadata, only to
        the extent our infrastructure actually collects it for operating and securing the Service. We do not
        use advertising cookies or third-party tracking technologies that are not described in this Policy.</p>
      </LegalSection>

      <LegalSection id="how-we-use-information" title="2. How We Use Information">
        <p>We use the information described above to:</p>
        <ul>
          <li>Create and administer accounts</li>
          <li>Authenticate users and keep accounts secure</li>
          <li>Provide Human, Product, and Warranty verification workflows</li>
          <li>Assign records to manual or third-party verifiers</li>
          <li>Process reports submitted by verifiers</li>
          <li>Run supported automatic verification checks</li>
          <li>Display verification results and status to authorized users</li>
          <li>Generate and manage digital credentials, including SDCs</li>
          <li>Support QR-based and report-link verification</li>
          <li>Communicate operational information about your account or requests</li>
          <li>Provide customer and technical support</li>
          <li>Detect and prevent misuse, fraud, and security issues</li>
          <li>Maintain, troubleshoot, and improve the Service</li>
          <li>Meet applicable legal or regulatory requirements</li>
        </ul>
        <p>We do not sell your information. We do not use verification data for third-party advertising.</p>
      </LegalSection>

      <LegalSection id="manual-verification" title="3. Manual and Third-Party Verification">
        <p>Where a verification type is completed manually or by a third party, the current process works as
        follows:</p>
        <ul>
          <li>An organization or SuperAdmin can assign specific records to a verifier for a given verification
          type.</li>
          <li>The verifier receives a secure, tokenized link to a dedicated upload page.</li>
          <li>Through that link, the verifier can access only the records assigned to that specific request —
          nothing else on the platform.</li>
          <li>The verifier may upload a report and approve or reject the verification for each assigned
          record.</li>
          <li>TruMarkZ then displays the resulting status, report, and any rejection reason to authorized
          users of the corresponding organization or account.</li>
          <li>Where our systems designate the verifier as the sole decision-maker for a manual verification,
          SuperAdmin and organization views of that decision are read-only.</li>
        </ul>
        <p>We do not disclose the technical format of verification tokens or links in this Policy.</p>
      </LegalSection>

      <LegalSection id="how-information-may-be-shared" title="4. How Information May Be Shared">
        <p>We share information only in the following circumstances:</p>
        <ul>
          <li><strong>With organizations and authorized account users</strong> who submitted or are entitled
          to view the relevant records.</li>
          <li><strong>With assigned third-party verifiers</strong>, limited to the records assigned to their
          specific verification request.</li>
          <li><strong>With technical and service infrastructure providers</strong> that we rely on to operate
          storage, authentication, email delivery, or hosting for the Service.</li>
          <li><strong>With credential and verification infrastructure providers</strong>, such as Dhiway,
          where required to issue or support a digital credential or SDC.</li>
          <li><strong>Where required by law</strong>, or to prevent fraud, protect security, or protect the
          rights, property, or safety of TruMarkZ, our users, or others.</li>
          <li><strong>In connection with a merger, restructuring, or business transfer</strong>, if
          applicable, subject to appropriate protections.</li>
        </ul>
        <p>We do not share your information with advertisers.</p>
      </LegalSection>

      <LegalSection id="digital-credentials" title="5. Digital Credentials, SDCs, and Blockchain-Backed Records">
        <p>TruMarkZ may issue, or facilitate the issuance of, externally verifiable digital credentials
        through third-party credential and blockchain infrastructure. As part of this process, credential
        identifiers, verification proofs, public IDs, or credential representations may be recorded or
        published through external systems outside TruMarkZ's own databases.</p>
        <p>Blockchain and distributed-ledger systems are, by design, often persistent and difficult or
        impossible to alter once a record is written. As a result:</p>
        <ul>
          <li>Deleting a batch, account, or local record within TruMarkZ does not necessarily remove or erase
          a credential that has already been issued through an external credential or distributed-ledger
          system.</li>
          <li>You should not assume that ordinary database deletion behaves the same way for externally
          issued credentials as it does for data held only within TruMarkZ's own systems.</li>
        </ul>
        <p>We do not place raw Aadhaar numbers, PAN numbers, or underlying identity documents on any
        blockchain or distributed ledger. Not all personal data associated with a verification is placed
        on-chain — only what the specific credential mechanism requires.</p>
      </LegalSection>

      <LegalSection id="data-storage-and-security" title="6. Data Storage and Security">
        <p>We use administrative, technical, and organizational safeguards that we consider reasonable and
        appropriate for the Service, including secure, tokenized links for verifier uploads. No service,
        however, can guarantee absolute security, and we cannot promise that a security incident will never
        occur. We do not claim a specific security certification or a specific encryption standard for data at
        rest or in transit unless it has been independently confirmed and documented.</p>
      </LegalSection>

      <LegalSection id="data-retention-and-deletion" title="7. Data Retention and Deletion">
        <p>We retain information for as long as necessary to provide the Service, maintain verification and
        credential records, meet contractual, legal, or security requirements, or as otherwise required. Where
        you or your organization are entitled to request deletion, we will remove data from our own systems
        subject to applicable operational and legal constraints.</p>
        <p>As described in the section on digital credentials above, an already-issued external credential may
        not be erasable in the same way as data held only in TruMarkZ's own systems. Backup and log retention
        may also follow separate operational schedules. We do not currently commit to a specific fixed
        retention period in this Policy.</p>
      </LegalSection>

      <LegalSection id="your-choices-and-rights" title="8. Your Choices and Rights">
        <p>Depending on where you are located, applicable law may provide you with rights to access, correct,
        delete, or restrict the use of your information, to object to certain processing, or to withdraw
        consent where our processing relies on it. You can also contact our support team for assistance with
        your account or data. We will respond to requests consistent with applicable law; not every right
        described above applies in every jurisdiction.</p>
      </LegalSection>

      <LegalSection id="data-about-other-people" title="9. Data Submitted About Other People">
        <p>If you or your organization submit another person's personal information for verification, you
        represent that you have the authority, permission, notice, consent, or other lawful basis required to
        submit that data. You are responsible for ensuring that your submission is lawful, accurate, and made
        with any consent required under applicable law.</p>
      </LegalSection>

      <LegalSection id="children" title="10. Children and Minors">
        <p>The Service is not intended to be used by children in circumstances where applicable law requires
        parental or guardian authorization, unless that authorization and any other required lawful basis have
        been obtained.</p>
      </LegalSection>

      <LegalSection id="third-party-services" title="11. Third-Party Services">
        <p>The Service relies on third-party services for functions such as authentication, credential
        infrastructure, storage and hosting, and email delivery. Where you interact with those services
        directly (for example, signing in with Google), their processing of your information is governed by
        their own terms and privacy policies.</p>
      </LegalSection>

      <LegalSection id="changes-to-this-policy" title="12. Changes to This Privacy Policy">
        <p>We may update this Privacy Policy from time to time. We will update the "Last updated" date above
        when we do. Continued use of the Service after an update means you accept the revised Policy.</p>
      </LegalSection>

      <LegalSection id="contact-us" title="13. Contact Us">
        <p>
          If you have questions about this Privacy Policy or how your information is handled, contact us at{' '}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
};

export default PrivacyPolicy;

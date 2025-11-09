"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Download, Printer, Search } from "lucide-react";
import { cn } from "@/lib/utils";

function QuestionAnswer({ question, answer, type }) {
  if (!answer || (Array.isArray(answer) && answer.length === 0)) {
    return null;
  }
  
  if (type === 'array' && Array.isArray(answer)) {
    return (
      <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
        <div className="text-sm text-gray-700 font-medium mb-3">{question}</div>
        <div className="space-y-3">
          {answer.map((item, idx) => (
            <div key={idx} className="pl-4 border-l-2 border-gray-300">
              {typeof item === 'object' ? (
                <div className="space-y-2">
                  {Object.entries(item).map(([key, value]) => (
                    <div key={key}>
                      <div className="text-xs text-gray-600 font-medium capitalize">
                        {key.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm text-gray-900">
                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value || 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-900">{item}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
      <div className="text-sm text-gray-700 font-medium">{question}</div>
      <div className="text-sm text-gray-900 mt-1">
        {typeof answer === 'boolean' ? (answer ? 'Yes' : 'No') : answer}
      </div>
    </div>
  );
}

function SectionCard({ section, expanded, onToggle, searchQuery }) {
  const hasQuestions = section.questions.length > 0;
  
  const filteredQuestions = section.questions.filter(q => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const matchQuestion = q.question.toLowerCase().includes(searchLower);
    const matchAnswer = typeof q.answer === 'string' 
      ? q.answer.toLowerCase().includes(searchLower)
      : Array.isArray(q.answer) 
        ? q.answer.some(a => String(a).toLowerCase().includes(searchLower))
        : false;
    return matchQuestion || matchAnswer;
  });

  if (searchQuery && filteredQuestions.length === 0) return null;
  
  return (
    <Card className="rounded-lg shadow-sm overflow-hidden border border-gray-200">
      <Collapsible open={expanded} onOpenChange={onToggle}>
        <div className="flex items-center justify-between p-5 bg-gray-50 hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-3 flex-1">
            <h3 className="font-semibold text-gray-900">{section.title}</h3>
            {hasQuestions && (
              <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                {searchQuery ? filteredQuestions.length : section.questions.length} items
              </span>
            )}
          </div>
          <CollapsibleTrigger asChild>
            <button className="p-1 hover:bg-gray-200 rounded transition-colors">
              <ChevronDown className={cn(
                "w-5 h-5 text-gray-500 transition-transform",
                expanded && "rotate-180"
              )} />
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="p-5 space-y-3 bg-white">
            {filteredQuestions.length > 0 ? (
              filteredQuestions.map((q, idx) => (
                <QuestionAnswer 
                  key={idx}
                  question={q.question}
                  answer={q.answer}
                  type={q.type}
                />
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">No information provided yet</p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function ReviewPDFPage() {
  const params = useParams();
  const [expandAll, setExpandAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [application, setApplication] = useState(null);
  const [draft, setDraft] = useState({});
  
  const matterId = params.matterId;

  // Fetch application and draft data
  useEffect(() => {
    const fetchData = async () => {
      if (!matterId) {
        setError('Matter ID is required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch application
        const appResponse = await fetch(`/api/review-pdf/application/${matterId}`);
        const appResult = await appResponse.json();

        if (!appResult.success) {
          setError(appResult.error || 'Application not found');
          setIsLoading(false);
          return;
        }

        setApplication(appResult.application);

        // Fetch draft data
        const draftResponse = await fetch(`/api/review-pdf/application/${matterId}/draft`);
        const draftResult = await draftResponse.json();

        if (draftResult.success) {
          setDraft(draftResult.draft || {});
        } else {
          console.warn('Draft data not available:', draftResult.error);
          setDraft({});
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message || 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [matterId]);
  
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // For now, use print functionality
    // Future: implement jsPDF or server-side PDF generation
    window.print();
  };

  // Transform draft data to sections (same structure as main app)
  const mainApplicant = draft.mainApplicant || {};
  const details = mainApplicant.details || {};
  const otherNames = mainApplicant.otherNames || {};
  const identity = mainApplicant.identity || {};
  const employment = mainApplicant.employment || {};
  const education = mainApplicant.education || {};
  const language = mainApplicant.language || {};
  const family = mainApplicant.family || {};
  
  const allApplicants = draft.allApplicants || {};
  const addresses = allApplicants.addresses || {};
  const character = allApplicants.character || {};
  const contactDetails = allApplicants.contactDetails || {};
  const health = allApplicants.health || {};
  const travelHistory = allApplicants.travelHistory || {};
  const visas = allApplicants.visas || {};
  
  const sections = [
    {
      title: "Main Applicant Details",
      questions: [
        { question: "Are you the main applicant?", answer: details.is_main_applicant },
        { question: "Title/Prefix", answer: details.prefix },
        { question: "What is your family name?", answer: details.family_name },
        { question: "What are your given names?", answer: details.given_names },
        { question: "Preferred name(s)", answer: details.preferred_names },
        { question: "What is your gender?", answer: details.gender },
        { question: "What is your date of birth?", answer: details.dob },
        { question: "What is your country of birth?", answer: details.country_of_birth },
        { question: "Suburb of birth", answer: details.suburb_of_birth },
        { question: "City/Town of birth", answer: details.city_of_birth },
        { question: "State/Province of birth", answer: details.state_of_birth },
        { question: "Marital status", answer: details.marital_status },
      ].filter(q => q.answer),
    },
    {
      title: "Other Names",
      questions: [
        { question: "Have you been known by any other names?", answer: otherNames.has_other_names },
        { question: "Other names", answer: otherNames.other_names, type: 'array' },
      ].filter(q => q.answer),
    },
    {
      title: "Identity Documents",
      questions: [
        { question: "Citizenship countries", answer: identity.citizenships, type: 'array' },
        { question: "National identity cards", answer: identity.nationalIdentityCards, type: 'array' },
        { question: "Passports", answer: identity.passports, type: 'array' },
      ].filter(q => q.answer && (Array.isArray(q.answer) ? q.answer.length > 0 : true)),
    },
    {
      title: "Employment History",
      questions: [
        { question: "Employment records", answer: employment.employments, type: 'array' },
      ].filter(q => q.answer && (Array.isArray(q.answer) ? q.answer.length > 0 : true)),
    },
    {
      title: "Education",
      questions: [
        { question: "Have you completed post-secondary education?", answer: education.hasEducation },
        { question: "Education records", answer: education.educations, type: 'array' },
      ].filter(q => q.answer && (Array.isArray(q.answer) ? q.answer.length > 0 : true)),
    },
    {
      title: "Language Proficiency",
      questions: [
        { question: "Language tests", answer: language.languageTests, type: 'array' },
      ].filter(q => q.answer && (Array.isArray(q.answer) ? q.answer.length > 0 : true)),
    },
    {
      title: "Family Information",
      questions: [
        { question: "Relationship status", answer: family.relationshipStatus },
        { question: "Partner details", answer: family.partner },
      ].filter(q => q.answer),
    },
    {
      title: "Contact Details",
      questions: [
        { question: "Email address", answer: contactDetails.email },
        { question: "Home phone", answer: contactDetails.homePhone },
        { question: "Mobile phone", answer: contactDetails.mobilePhone },
        { question: "Business phone", answer: contactDetails.businessPhone },
      ].filter(q => q.answer),
    },
    {
      title: "Addresses",
      questions: [
        { question: "Current addresses", answer: addresses.currentAddresses, type: 'array' },
      ].filter(q => q.answer && (Array.isArray(q.answer) ? q.answer.length > 0 : true)),
    },
    {
      title: "Travel History",
      questions: [
        { question: "Travel history", answer: travelHistory.travels, type: 'array' },
      ].filter(q => q.answer && (Array.isArray(q.answer) ? q.answer.length > 0 : true)),
    },
    {
      title: "Previous Visas",
      questions: [
        { question: "Previous visa applications", answer: visas.applications, type: 'array' },
      ].filter(q => q.answer && (Array.isArray(q.answer) ? q.answer.length > 0 : true)),
    },
    {
      title: "Health Information",
      questions: [
        { question: "Health examinations", answer: health.examinations, type: 'array' },
        { question: "Healthcare work history", answer: health.healthcareWork, type: 'array' },
        { question: "TB history", answer: health.tbHistory, type: 'array' },
        { question: "Health conditions", answer: health.conditions, type: 'array' },
      ].filter(q => q.answer && (Array.isArray(q.answer) ? q.answer.length > 0 : true)),
    },
    {
      title: "Character Information",
      questions: [
        { question: "Character questions", answer: character.questions },
        { question: "Criminal convictions", answer: character.convictions, type: 'array' },
        { question: "Military service", answer: character.militaryService, type: 'array' },
      ].filter(q => q.answer),
    },
  ];
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Please check that the Matter ID is correct and try again.
          </p>
        </Card>
      </div>
    );
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">Loading application data...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="font-semibold text-gray-900 text-2xl">Review & PDF</h1>
              <p className="text-sm text-gray-700 mt-1">
                {application?.reference && (
                  <span>Application: {application.reference}</span>
                )}
                {application?.type && (
                  <span className="ml-2">• {application.type}</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandAll(!expandAll)}
              >
                {expandAll ? 'Collapse All' : 'Expand All'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search responses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
          </div>
          
          {/* Sections */}
          {sections.every(s => s.questions.length === 0) ? (
            <Card className="p-12 text-center">
              <p className="text-gray-600">
                No questionnaire data available for this application.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {sections.map((section, idx) => (
                <SectionCard
                  key={idx}
                  section={section}
                  expanded={expandAll}
                  onToggle={() => {}}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


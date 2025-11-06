"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSnapshot } from "valtio";
import { applicationsStore } from "@/stores/applicationsStore";
import { draftStore } from "@/stores/draftStore";
import { authStore } from "@/stores/authStore";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { PillNav } from "@/components/PillNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Download, Printer, Edit, Search } from "lucide-react";
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
  const router = useRouter();
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
  
  const handleEdit = (e) => {
    e.stopPropagation();
    if (section.editHref) {
      router.push(section.editHref);
    }
  };
  
  return (
    <Card className="rounded-lg shadow-sm overflow-hidden border border-gray-200">
      <Collapsible open={expanded} onOpenChange={onToggle}>
        <div className="flex items-center justify-between p-5 bg-gray-50 hover-elevate transition-colors">
          <div className="flex items-center gap-3 flex-1">
            <h3 className="font-semibold text-gray-900">{section.title}</h3>
            {hasQuestions && (
              <span className="text-xs text-gray-600 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                {searchQuery ? filteredQuestions.length : section.questions.length} items
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {section.editHref && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={handleEdit}
                data-testid={`button-edit-${section.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
            <CollapsibleTrigger asChild>
              <button className="p-1 hover:bg-gray-200 rounded transition-colors" data-testid={`button-toggle-${section.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <ChevronDown className={cn(
                  "w-5 h-5 text-gray-500 transition-transform",
                  expanded && "rotate-180"
                )} />
              </button>
            </CollapsibleTrigger>
          </div>
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

export default function ReviewPage() {
  const params = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const applicationsSnap = useSnapshot(applicationsStore);
  const draftSnap = useSnapshot(draftStore);
  const authSnap = useSnapshot(authStore);
  
  const appId = params.id;
  const application = applicationsSnap.applications.find(app => app.id === appId);
  const draft = draftSnap.draft || {};
  
  // Load applications and draft data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Wait for auth to be ready
        if (!authSnap.isAuthenticated && !authSnap.user) {
          await authStore.checkSession();
        }

        const userId = authSnap.user?.id;
        if (userId) {
          // Load applications if not already loaded
          if (applicationsSnap.applications.length === 0) {
            await applicationsStore.loadApplications(userId);
          }
        }

        // Load draft data
        if (appId) {
          draftStore.setApplicationId(appId);
          await draftStore.loadDraft(appId);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [appId, authSnap.isAuthenticated, authSnap.user?.id, applicationsSnap.applications.length]);
  
  const handlePrint = () => {
    window.print();
  };
  
  // Extract nested data safely
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
  const contacts = allApplicants.contacts || {};
  const futureAddresses = allApplicants.futureAddresses || {};
  const futureTravel = allApplicants.futureTravel || {};
  const health = allApplicants.health || {};
  const travelHistory = allApplicants.travelHistory || {};
  const visas = allApplicants.visas || {};
  
  const sections = [
    {
      title: "Main Applicant Details",
      editHref: `/intake/main-applicant/details`,
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
      editHref: `/intake/main-applicant/other`,
      questions: [
        { question: "Have you been known by any other names?", answer: otherNames.has_other_names },
        { question: "Other names", answer: otherNames.other_names, type: 'array' },
      ].filter(q => q.answer),
    },
    {
      title: "Identity Documents",
      editHref: `/intake/main-applicant/identity`,
      questions: [
        { question: "Citizenship countries", answer: identity.citizenships, type: 'array' },
        { question: "National identity cards", answer: identity.nationalIdentityCards, type: 'array' },
        { question: "Passports", answer: identity.passports, type: 'array' },
      ].filter(q => q.answer && (Array.isArray(q.answer) ? q.answer.length > 0 : true)),
    },
    {
      title: "Employment History",
      editHref: `/intake/main-applicant/employment`,
      questions: [
        { question: "Employment records", answer: employment.employments, type: 'array' },
      ].filter(q => q.answer && (Array.isArray(q.answer) ? q.answer.length > 0 : true)),
    },
    {
      title: "Education",
      editHref: `/intake/main-applicant/education`,
      questions: [
        { question: "Have you completed post-secondary education?", answer: education.hasEducation },
        { question: "Education records", answer: education.educations, type: 'array' },
      ].filter(q => q.answer && (Array.isArray(q.answer) ? q.answer.length > 0 : true)),
    },
    {
      title: "Language Proficiency",
      editHref: `/intake/main-applicant/language`,
      questions: [
        { question: "Language tests", answer: language.languageTests, type: 'array' },
      ].filter(q => q.answer && (Array.isArray(q.answer) ? q.answer.length > 0 : true)),
    },
    {
      title: "Family Information",
      editHref: `/intake/main-applicant/family`,
      questions: [
        { question: "Relationship status", answer: family.relationshipStatus },
        { question: "Partner details", answer: family.partner },
      ].filter(q => q.answer),
    },
    {
      title: "Contact Details",
      editHref: `/intake/all-applicants/contact-details`,
      questions: [
        { question: "Email address", answer: contactDetails.email },
        { question: "Home phone", answer: contactDetails.homePhone },
        { question: "Mobile phone", answer: contactDetails.mobilePhone },
        { question: "Business phone", answer: contactDetails.businessPhone },
      ].filter(q => q.answer),
    },
    {
      title: "Addresses",
      editHref: `/intake/all-applicants/addresses`,
      questions: [
        { question: "Current addresses", answer: addresses.currentAddresses, type: 'array' },
      ].filter(q => q.answer && (Array.isArray(q.answer) ? q.answer.length > 0 : true)),
    },
    {
      title: "Travel History",
      editHref: `/intake/all-applicants/travel-history`,
      questions: [
        { question: "Travel history", answer: travelHistory.travels, type: 'array' },
      ].filter(q => q.answer && (Array.isArray(q.answer) ? q.answer.length > 0 : true)),
    },
    {
      title: "Previous Visas",
      editHref: `/intake/all-applicants/visas`,
      questions: [
        { question: "Previous visa applications", answer: visas.applications, type: 'array' },
      ].filter(q => q.answer && (Array.isArray(q.answer) ? q.answer.length > 0 : true)),
    },
    {
      title: "Health Information",
      editHref: `/intake/all-applicants/health`,
      questions: [
        { question: "Health examinations", answer: health.examinations, type: 'array' },
        { question: "Healthcare work history", answer: health.healthcareWork, type: 'array' },
        { question: "TB history", answer: health.tbHistory, type: 'array' },
        { question: "Health conditions", answer: health.conditions, type: 'array' },
      ].filter(q => q.answer && (Array.isArray(q.answer) ? q.answer.length > 0 : true)),
    },
    {
      title: "Character Information",
      editHref: `/intake/all-applicants/character`,
      questions: [
        { question: "Character questions", answer: character.questions },
        { question: "Criminal convictions", answer: character.convictions, type: 'array' },
        { question: "Military service", answer: character.militaryService, type: 'array' },
      ].filter(q => q.answer),
    },
  ];
  
  // Show loading state while data is being loaded
  if (isLoading || !application) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:block">
        <AppSidebar mode="contextual" application={application} />
      </div>
      
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0">
            <AppSidebar mode="contextual" application={application} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col">
        <AppHeader 
          onMenuClick={() => setSidebarOpen(true)} 
        />
        
        <div className="lg:hidden">
          <PillNav appId={appId} />
        </div>
        
        <main className="flex-1 px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="font-semibold text-gray-900 text-2xl">Review & PDF</h1>
                <p className="text-sm text-gray-700 mt-1">Review your application details</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandAll(!expandAll)}
                  data-testid="button-expand-all"
                >
                  {expandAll ? 'Collapse All' : 'Expand All'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  data-testid="button-print"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-download"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search responses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white"
                  data-testid="input-search"
                />
              </div>
            </div>
            
            {isLoading ? (
              <Card className="p-12 text-center">
                <p className="text-gray-600">Loading your data...</p>
              </Card>
            ) : (
              <>
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
                
                {sections.every(s => s.questions.length === 0) && !searchQuery && (
                  <Card className="p-12 text-center">
                    <p className="text-gray-600">
                      No questionnaire data yet. Complete the questionnaire to see your responses here.
                    </p>
                    <Link href={`/applications/${appId}/questionnaire`}>
                      <Button className="mt-4" data-testid="button-start-questionnaire-empty">
                        Start Questionnaire
                      </Button>
                    </Link>
                  </Card>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

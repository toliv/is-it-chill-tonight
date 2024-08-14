"use client";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectGroup,
} from "@repo/ui/src/select";
import { getThemeToggler } from "../lib/get-theme-button";
import { Slider } from "@repo/ui/src/slider";
import { SliderThumb } from "@radix-ui/react-slider";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { motion } from 'framer-motion';


// export const runtime = "edge";

// TODO
// 4. CHAT PAGE ??

function readCookie(): Record<string, string> {
  const cookieName = `userVenueSurveys`;
  const lastSubmission = document.cookie.split('; ').find(row => row.startsWith(`${cookieName}=`));
  if(lastSubmission){
    // Some b64 strings can contain equal signs, so just split it based on the exact cookie name
    const c = lastSubmission.split(`${cookieName}=`);
    const jsonString = c[1] ? atob(c[1]) : '';
    // 3. Parse the JSON string back into an object
    const jsonObject = JSON.parse(jsonString);
    return jsonObject;
  }
  return {};
}

function clearCookie() {
  const cookieName = `userVenueSurveys`;
  document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function markVenueAsSurveyed(venueName: string){
  const cookieName = `userVenueSurveys`;
  let existingValue = readCookie();
  existingValue[venueName] = new Date().toISOString();
  const base64Encoded = btoa(JSON.stringify(existingValue));
  // Max age is 12 hours
  document.cookie = `${cookieName}=${base64Encoded}; path=/; max-age=43200`;
}

function hasSubmittedRecently(venueName?: string ) {
  if(!venueName){
    return false;
  }
  const c = readCookie();
  if (venueName in c) {
    return true;
  }
  return false;
}

function latestSubmissionTimeFromCookie(){
  const cookieData = readCookie();
  if (Object.keys(cookieData).length === 0) {
    return null;
  }

  const dates = Object.values(cookieData).map(dateString => new Date(dateString));
  return new Date(Math.max(...dates.map(date => date.getTime())));
}

function getReviewedTimeFromCookie(venueName: string){
  const cookieData = readCookie();
  if(cookieData){
    return cookieData[venueName] ? new Date(cookieData[venueName]) : null;
  }
  return null;
}

export default function Page() {
  const SetThemeButton = getThemeToggler();

  const [venues, setVenues] = useState<any>([]);
  const [selectedVenue, setSelectedVenue] = useState<VenueTypeOption | null>(null);
  const [userSubmittedRecently, setUserSubmittedRecently] = useState<boolean>(false);
  const [latestSubmissionTime, setLatestSubmissionTime] = useState<Date | null> (null);
  const [userRateLimited, setUserRateLimited] = useState<boolean>(false);

  const [isAdminMode, setIsAdminMode] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isAdmin = searchParams.get('adminMode') !== null;
    setIsAdminMode(isAdmin);
  }, []);


  useEffect(() => {
    async function fetchVenues() {
      try {
        const response = await fetch("/api/venues");
        const data = await response.json();
        setVenues(data);
      } catch (error) {
        console.error("Error fetching venues:", error);
      }
    }
    fetchVenues();
  }, []);

  useEffect(() => {
    setUserSubmittedRecently(hasSubmittedRecently(selectedVenue?.name));
    const lastSubmissionTime = latestSubmissionTimeFromCookie()
    const rateLimited = (lastSubmissionTime && (new Date().getTime() - lastSubmissionTime.getTime() < 30 * 60 * 1000)) ? true : false;
    setUserRateLimited(rateLimited)
    if(selectedVenue){
      setLatestSubmissionTime(getReviewedTimeFromCookie(selectedVenue.name));
    }
    
  }, [selectedVenue, userSubmittedRecently]);


  return (
    <main className="flex flex-col items-center justify-start min-h-screen pt-8 px-4">
      <div className="flex max-w-2xl justify-between w-full items-center">
        <SetThemeButton />
        {isAdminMode && <div>
          <button onClick={() => {
            clearCookie()
            setUserSubmittedRecently(false);
            setSelectedVenue(null);
            }}>
            Reset Cookie
          </button>
        </div>}
      </div>
      <div className="max-w-2xl text-start w-full mt-16">
        <VenueSelect venues={venues} setSelectedVenue={setSelectedVenue}></VenueSelect>
        {!userSubmittedRecently && <VenueSurvey venue={selectedVenue} setUserSubmittedRecently={setUserSubmittedRecently} userRateLimited={userRateLimited}/>}
        {userSubmittedRecently && selectedVenue && latestSubmissionTime &&
          <div className="pt-8 flex flex-col gap-4">
            <div className="">{`You've already reviewed ${selectedVenue.name} today at ${latestSubmissionTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}!`}
            </div>
          <div>
            Results
          </div>
          <div>
            <VenueSurveyResults venue={selectedVenue} />
          </div>
        </div>
        }
      </div>
      <div></div>
    </main>
  );
}

interface VenueTypeOption {
  name: string;
  id: string;
}

function VenueSelect({ venues, setSelectedVenue}: { venues: VenueTypeOption[], setSelectedVenue: any }) {
  return (
    venues && (
      <Select onValueChange={(value) => {
        const selectedVenue = venues.find(venue => venue.id === value);
        setSelectedVenue(selectedVenue);
      }}>
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Select a venue" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Venues</SelectLabel>
            {venues.map((venue) => {
              return (
                <SelectItem key={venue.id} value={venue.id}>{`${venue.name}`}</SelectItem>
              );
            })}
          </SelectGroup>
        </SelectContent>
      </Select>
    )
  );
}

function VenueSurvey({venue, setUserSubmittedRecently, userRateLimited}: {venue: VenueTypeOption |null, setUserSubmittedRecently: any, userRateLimited: boolean}) {
  

  const venueSurveySchema = z.object({
    mellowOrDancey: z.number().min(0).max(100),
    crowded: z.number().min(0).max(100),
    securityChill: z.number().min(0).max(100),
    ratio: z.number().min(0).max(100),
    lineSpeed: z.number().min(0).max(100),
  });

  type VenueSurveyData = z.infer<typeof venueSurveySchema>;

  const form = useForm<VenueSurveyData>({
    resolver: zodResolver(venueSurveySchema),
    defaultValues: {
      mellowOrDancey: Math.floor(Math.random() * 101),
      crowded: Math.floor(Math.random() * 101),
      securityChill: Math.floor(Math.random() * 101),
      ratio: Math.floor(Math.random() * 101),
      lineSpeed: Math.floor(Math.random() * 101),
    },
  });

  useEffect(() => {
    form.reset({
      mellowOrDancey: Math.floor(Math.random() * 101),
      crowded: Math.floor(Math.random() * 101),
      securityChill: Math.floor(Math.random() * 101),
      ratio: Math.floor(Math.random() * 101),
      lineSpeed: Math.floor(Math.random() * 101),
    });
  }, [venue]);

  const onSubmit = (data: VenueSurveyData) => {
    if(venue){
      console.log(data);
      // Handle form submission
      // POST the form data to /api/surveys
      fetch('/api/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          venueId: venue.id,
          ...data
        }),
      })
      .then(response => response.json())
      .then(result => {
        console.log('Survey submitted successfully:', result);
        // Set a cookie with the submission timestamp
        markVenueAsSurveyed(venue.name);
        // You can add additional logic here, such as showing a success message
        setUserSubmittedRecently(true);
      })
      .catch(error => {
        console.error('Error submitting survey:', error);
        // You can add error handling logic here
      });
    }
  };

  return venue && (
    <>

    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col py-8 gap-4">
    {
      userRateLimited && <div>
        How can you be two places at once 🤔?
      </div>
    }
      <div>
        Mellow or Dance-y?
      </div>
      <div className="flex gap-4 items-center">
        <div className='text-xl'>🌴</div>
        <Controller
          name="mellowOrDancey"
          control={form.control}
          render={({ field: { onChange, value } }) => (
            <Slider
              className="cursor-pointer"
              value={[value]}
              onValueChange={(vals) => onChange(vals[0])}
              max={100}
              step={1}
            />
          )}
        />
        <div className='text-xl'>🕺</div>
      </div>
      <div>
        Crowded?
      </div>
      <div className="flex gap-4 items-center">
        <div className="text-xl">🧍</div>
        <Controller
          name="crowded"
          control={form.control}
          render={({ field: { onChange, value } }) => (
            <Slider
              className="cursor-pointer animate-fade-in"
              value={[value]}
              onValueChange={(vals) => onChange(vals[0])}
              max={100}
              step={1}
              aria-label="crowded"
            >
              <SliderThumb className="animate-slide-in">
                <div className="absolute top-[-25px] left-1/2 transform -translate-x-1/2 bg-white text-black px-2 py-1 rounded text-xs animate-pop-in">
                  Crowded
                </div>
              </SliderThumb>
            </Slider>
          )}
        />
        <div className="flex">
          <div className="text-xl">🧍</div>
          <div className="text-xl">🧍</div>
        </div>
      </div>
      <div>
        Security Chill?
      </div>
    <div className="flex gap-4 items-center">
        <div className='text-xl'>😎</div>
        <Controller
          name="securityChill"
          control={form.control}
          render={({ field: { onChange, value } }) => (
            <Slider
              className="cursor-pointer"
              value={[value]}
              onValueChange={(vals) => onChange(vals[0])}
              max={100}
              step={1}
            />
          )}
        />
        <div className='text-xl'>🤬</div>
      </div>
      <div>
        Ratio?
      </div>
      <div className="flex gap-4 items-center">
        <div className="text-xl">🙋‍♀️</div>
        <Controller
          name="ratio"
          control={form.control}
          render={({ field: { onChange, value } }) => (
            <Slider
              className="cursor-pointer"
              value={[value]}
              onValueChange={(vals) => onChange(vals[0])}
              max={100}
              step={1}
              aria-label="ratio"
            />
          )}
        />
        <div className="text-xl">🙆‍♂️</div>
      </div>
      <div>
        Line Speed?
      </div>
      <div className="flex gap-4 items-center">
        <div className="text-xl">💨</div>
        <Controller
          name="lineSpeed"
          control={form.control}
          render={({ field: { onChange, value } }) => (
            <Slider
              className="cursor-pointer"
              value={[value]}
              onValueChange={(vals) => onChange(vals[0])}
              max={100}
              step={1}
              aria-label="lineSpeed"
            />
          )}
        />
        <div className="text-xl">⏳</div>
      </div>
      <button 
        type="submit" 
        className={`mt-4 text-white px-4 py-2 rounded ${
          form.formState.isSubmitting || form.formState.isSubmitSuccessful
            ? 'bg-green-500' : !userRateLimited ? 
               'bg-blue-500' : 'bg-red-500'
        } ${userRateLimited ? "hover:cursor-not-allowed": ""}`}
        disabled={
          form.formState.isSubmitting || 
          form.formState.isSubmitSuccessful || userRateLimited
        }
      >
        {form.formState.isSubmitSuccessful ? 'Submitted!' : 'Submit'}
      </button>
    </form>
    </>
  );
}

function VenueSurveyResults({venue} : {venue:VenueTypeOption }){
  const [surveyResults, setSurveyResults] = useState<any>();

  useEffect(() => {
    async function fetchSurveyResults() {
      try {
        const response = await fetch(`/api/surveys?venueId=${venue.id}`);
        const data = await response.json();
        setSurveyResults(data);
      } catch (error) {
        console.error("Error fetching venues:", error);
      }
    }
    fetchSurveyResults();
  }, []);
  
  return (surveyResults &&
    <div className="flex flex-col py-8 gap-4">
      <div>
        Mellow or Dance-y?
      </div>
      <div className="flex gap-4 items-center">
        <div className='text-xl'>🌴</div>
        <SurveyResultSlider result={surveyResults.avgMellowOrDancey}/>
        <div className='text-xl'>🕺</div>
      </div>
      <div>
        Crowded?
      </div>
      <div className="flex gap-4 items-center">
        <div className="text-xl">🧍</div>
        <SurveyResultSlider result={surveyResults.avgCrowded}/>
        <div className="flex">
          <div className="text-xl">🧍</div>
          <div className="text-xl">🧍</div>
        </div>
      </div>
      <div>
        Security Chill?
      </div>
      <div className="flex gap-4 items-center">
        <div className='text-xl'>😎</div>
        <SurveyResultSlider result={surveyResults.avgSecurityChill}/>
        <div className='text-xl'>🤬</div>
      </div>
      <div>
        Ratio?
      </div>
      <div className="flex gap-4 items-center">
        <div className="text-xl">🙋‍♀️</div>
        <SurveyResultSlider result={surveyResults.avgRatio}/>
        <div className="text-xl">🙆‍♂️</div>
      </div>
      <div>
        Line Speed?
      </div>
      <div className="flex gap-4 items-center">
      <div className="text-xl">💨</div>
        <SurveyResultSlider result={surveyResults.avgLineSpeed}/>
        <div className="text-xl">⏳</div>
      </div>
      
    </div>
  )
}


const SurveyResultSlider = ({ result }: {result: number}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const resultRounded = Math.round(result);
  const rightSide = resultRounded > 50; 

  return (
    <div className="w-full mx-auto">
      <div className={`relative h-4  rounded-full overflow-hidden shadow-md ${rightSide ? "bg-red-600" : "bg-green-700"}`}>
        <motion.div
          className={`absolute top-0 left-0 h-full rounded-full ${rightSide ? "bg-green-700" : "bg-red-600"}`}
          initial={{ width: 0 }}
          animate={{ width: isLoaded ? `${result}%` : 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

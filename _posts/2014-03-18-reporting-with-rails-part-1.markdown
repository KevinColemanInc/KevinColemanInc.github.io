---
layout: post
title: "Reporting with Rails Part 2"
date: 2014-03-18 01:49:55 -0400
comments: true
categories: 
---

This is version two of my reporting schema used for Focused Care Solutions reporting to case managers.  This pattern follows contains a lot of the benefits of the first one, except hides a lot of the code messiness.

## Goodbye lib/reports.rb
I hated how cluttered and ugly reports.rb got.  It ended being a graveyard for code decay causing a massive file (+500 lines of SQL/Ruby code) making it crazy difficult to maintain and find things in.  Sooo much scrolling.

## Hello migrations!
This time I moved all of my SQL to be the data layer.  Everything was self contained in a reporting row.

```ruby _create_reports.rb
create_table :reports, id: :uuid do |t|
      t.string :name
      t.text :sql
      t.timestamps
    end
```

The reports model only contains the name of the report and the sql for this report.  The column formatting will be done within the query (no more slow ruby helper methods) and the user friendly column headers will be in the select.  PGResult gives you an array of all of the headers that you can loop through.

To add a report you simply create a migration and add the report in it:

```ruby add_all_member_report.rb
sql = 'SELECT
           email as "email",                 
           sign_in_count as "sign in count",
           last_sign_in_at as "last sign in at",
           created_at as "created at",
           updated_at as "updated at",
           archived_at as "archived at",
           first_name as "first name",
           last_name as "last name",
           phone_number as "phone number",
           member_number as "member number",
           date_of_birth as "date of birth",
           note as "note"
          FROM Users'
    
    Report.create!(
      name: "All Members",
      sql: sql
      )
```

This way, new developers only and new deployments have to run migrations when they are setting up a new box and you get a history of what each report was.  If you want to edit a report, find it by the name and change the SQL code.

## reports_controler.rb

I broke reports controller into two controller files.  One going in the API folder and one going in the top level reports folder.  The top level folder handles all of the HTML methods with reporting while the API actually runs the report.  This way the users aren’t stuck with a long page load time while the report is being run and I can leverage AngularJS to display the report results.

```ruby reports_controller.rb
class ReportsController < ApplicationController
  before_action :set_report, only: [:show]
  before_filter :authenticate_user!
  
  load_and_authorize_resource

  def index
    
  end

  def show
    
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_report
      @report = Report.find(params[:id])
    end
end
```

Only the index and show methods are needed here.  We don’t want regular users to created or edit reports (yet).  Show and Index methods handle the AngularJS HTML and, for the show, writes the report_id to tell the javascript what report to run.

```ruby api/v1/reports_controller.rb
class API::V1::ReportsController < ApplicationController
  respond_to :json
  before_filter :authenticate_user_from_token!
  before_filter :authenticate_user!

  before_action :set_report, only: [:show]

  load_and_authorize_resource

  def index
    @meter = Report.all
    render :index
  end

  def run
    @results = ActiveRecord::Base.connection.execute(@report.sql)
    render :run
  end

  private
  # Use callbacks to share common setup or constraints between actions.
    def set_report
      @report = Report.find(params[:id])
    end
end
```

Here the code is stupid simple.  There isn’t any complicated formatting or send functions.  All acts as a layer between the view and the data, as it should.

## run.json.jbuilder

Json for each report gets rendered with this view method.  Thanks to PGResult, you get a seperate list of the headers from the data.  I included that seperately from the data, so that it would be easier for the Javascript to find and render the form data.

```ruby run.json.jbuilder
json.table do
  json.headers @results.fields
  json.rows @results
end
```


## Pros

* Hides the SQL in the database, keeping the code base clean.
* The view is report agnostic.  You don’t have to write a separate view per report.
* Custom SQL == more control over reports behavior
* You don’t have to deploy to update a reporting query, but don’t forget to write a migration for it.
* Dynamically loaded via JSON, this allowing multiple clients to run reports.  (maybe a mobile app?)

## Cons

* You have to format on the database side, which makes writing the query more annoying, because you can’t use Rail’s helper methods.
* Editing Queries can be a little annoying, because you have to look up what is currently in the DB and create a migration to view it.

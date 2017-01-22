---
layout: post
title: "Reporting with Rails Part 1"
date: 2014-03-11 13:05:11 -0400
comments: true
categories: 
---
I have worked on several projects that need a reporting tool to present the data models in a complex manor.  I often find these queries to get more complicated than ActiveRecord is able to handle (think needing sub-arqueries or joining against tables that aren't represented by models).  As a result, I have to write raw SQL queries to handle the data retrieval.  This can get ugly very quickly if you are not careful on how you structure your framework for storing these queries.

I am going to describe the two ways that I have solved this issue and give you the pros and cons of each.  This will be the first article of two describing what the first iteration of this framework and why I choose to redesign it to something else.

## reports.rb

The first strategy involved creating a model called 'reports'.  This model only contained basic information of the report: (name, url_name, created_at, etc.)  

<img src="/images/report_diagram.png" title="Report ER Diagram" width="180px"/>

```ruby
create_table :reports, id: :uuid do |t|
      t.string :name
      t.string :url_name
      t.string :description
      t.timestamps
    end
```

For every report we wanted to have, we would create a new entry in the database with that information filled out.

These reports need to be install via rake tasks or migrations (to be honest, my personal preference is to use migrations, because when setting up a new box, you wont have to remember to run this other task).

```ruby
 Report.create!(
    name: "All Users",
    url_name: "all_users",
    description: "show all users in the database"
    )
```

## lib/reports.rb

Now that we know what reports are available, the next step is create their methods.  Each report gets its own method in lib/reports.rb, because that is where we will be storing the SQL and formatting rules for each of them.

An example report would look something like this:

```ruby
include ActionView::Helpers::NumberHelper

def all_users
  table_headers = ['id', 'Name', 'Email', 'Account Balance']
  sql = "SELECT id, name, email, balance FROM users"
  query_results = ActiveRecord::Base.connection.execute(sql)

  results = [table_headers]

  query_results.each do |query_result|
    results += [query_result[0],query_result[1],query_result[2], number_to_currency(query_result[3])]
  end
  results
end
```

Each method returns a [NxM] array of the results, ready to displayed in the html.  Pagination and sorting have been withheld from this example, as they are trivial to add in.  [Kaminari](https://github.com/amatsuda/kaminari) gem handles pagination very nicely, although for larger reports, I letting the database handle the pagination, ruby will have to loop through all of the data points, which is expensive.


## reports_controller.rb

Next a reports controller needs to get made.  This will have two methods in it: index, and show.

All index will do is show the list of report names and links to them (we used a drop down box with textboxes for begin and end date selectors).  Show is where the report will be displayed.  We probably should of made this an AJAX callback and requested the results separately, but I will get to that later.

The show method would grab from the URL the url_name of the report being run.  Then it would run [.send](http://ruby-doc.org/core-2.1.1/Object.html#method-i-send) to execute the method name of the string in the lib/reports.rb class.  The results were written to a table element with a timestamp of when the report was run.

```ruby
def show
  @report = Report.find_by_url_name(:url_name)
  @results = Report.send(@report.url_name)
end
```

[Brakeman](http://brakemanscanner.org/) hates this, because using .to_sym on any parameter is a huge security flaw.  This reporting engine was locked behind [CanCan](https://github.com/ryanb/cancan)/[Devise](https://github.com/plataformatec/devise) and only staff members had access to this page.  But someone malicious could of done a lot of damage to the system if abused.

## Pros

* Custom sql == more control over the queries allowing for greater efficiency
* SQL is managed in GIT, so you can easily view the changes
* Formatting is handled by RoR, which lets you make use of the helper methods
* Because the SQL lives in code, you can leverage ruby by creating custom ruby methods to generate portions of SQL.  (think a method the lets all reports sharing the same where conditions for datetime restrictions)

## Cons

* You will end up with a massive lib/reports.rb file, which can be difficult to maintain
* Because the formatting is handled by ruby, the report may run a little slow
* Security flaw with the .send
* Difficult to maintain.  If you change a column, then you have to modify your code a bunch of different places.
* Database dependency means for new deployments, a rake task, database migration, or seed must be run in order for the website to reflect the new reports

Part 2 will be linked here.


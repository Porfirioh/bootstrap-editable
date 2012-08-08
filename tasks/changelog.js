/*global config:true, task:true*/
module.exports = function(grunt) {

  grunt.registerTask('changelog', 'Generate changelog for milestone', function() {
      this.requiresConfig('changelog.user', 'changelog.repo');

      var options = grunt.config(this.name);
      
      if(!options.dest) options.dest = 'changelog';
      
      var GitHubApi = require("github");
      var github = new GitHubApi({
          version: "3.0.0"
      });

      var done = this.async();
      
      github.issues.getAllMilestones({
          user: options.user,
          repo: options.repo,
          state: 'closed',
          sort: 'completeness'
      }, function(err, res) {
          
          if(err) {
             grunt.log.error('repo "'+options.user+'/'+options.repo+'" not found!');
             done(false);
          }
          
          function writeFile() {
             var lines = [], line,
                 moment = require('moment'),
                 fs = require('fs');
             
             lines.push(options.repo+' change log'); 
             lines.push('============================='); 
             
             res.forEach(function(ms){
                lines.push("\r\n"); 
                lines.push('Version '+ms.title + (ms.due_on ? ' '+moment(ms.due_on).format('MMM D, YYYY') : '')); 
                lines.push('----------------------------'); 
                
                ms.issues.forEach(function(issue) {
                    issue.labels.forEach(function(e, i, arr) {arr[i] = e.name});
                    lines.push('['+issue.labels.join(',') + '] #'+issue.number+': '+issue.title+' (' + (issue.assignee ? ('@'+issue.assignee.login) : '') + ')');  
                });
             }); 

             fs.writeFileSync(options.dest, lines.join("\r\n"), 'utf8');
          }
          
          var finished = 0;
          res.forEach(function(ms){
              github.issues.repoIssues({
                  user: options.user,
                  repo: options.repo,
                  milestone: ms.number,
                  state: 'closed'
              }, (function(r) {
                   return function(err2, issues) {
                      r.issues = issues;
                      finished++;
                      console.log('Loaded issues for ' + r.title + ': '+issues.length);  
                      if(finished == res.length) {
                          writeFile();
                          done(true);
                      }
                   }
              })(ms));
          });
      });       
  });
};